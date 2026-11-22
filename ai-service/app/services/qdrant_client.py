import uuid
from typing import List, Dict, Any, Optional

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
    HAS_QDRANT_LIB = True
except ImportError:
    QdrantClient = None
    models = None
    HAS_QDRANT_LIB = False

from app.core.config import settings
from app.services.embedding import embedding_service
from app.services.relevance import relevant_hits, topic_terms

class QdrantService:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION
        self.client: Any = None
        self._in_memory_store: Dict[str, Dict[str, Any]] = {}
        self._init_client()

    def _init_client(self):
        if not HAS_QDRANT_LIB:
            print("[QdrantService] Notice: qdrant-client not installed on host. Running high-performance in-memory vector store.")
            return

        try:
            self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT, timeout=5.0)
            self._ensure_collection()
            print(f"[QdrantService] Connected to Qdrant at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
        except Exception as e:
            print(f"[QdrantService] Notice: Live Qdrant server unreachable ({e}). Initializing embedded in-memory vector store.")
            try:
                self.client = QdrantClient(":memory:")
                self._ensure_collection()
            except Exception as mem_err:
                print(f"[QdrantService] Memory fallback error: {mem_err}")
                self.client = None

    def _ensure_collection(self):
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                dim = embedding_service.dimension
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=dim,
                        distance=models.Distance.COSINE
                    )
                )
                # Create payload index for user_id to optimize multi-tenant filtering
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="user_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
                print(f"[QdrantService] Created collection '{self.collection_name}' with dim {dim}")
        except Exception as e:
            print(f"[QdrantService] _ensure_collection warning: {e}")

    def upsert_note(self, user_id: str, note_id: str, title: str, content: str, tags: List[str] = None) -> str:
        """Upsert a single note's vector representation"""
        combined_text = f"{title}\n\n{content}".strip()
        vector = embedding_service.embed_text(combined_text)
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"note-{user_id}-{note_id}"))

        payload = {
            "point_id": point_id,
            "user_id": user_id,
            "source_id": note_id,
            "source_type": "note",
            "title": title,
            "content": content[:2000],  # Store representative text for excerpts
            "tags": tags or [],
        }

        if self.client and HAS_QDRANT_LIB:
            try:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=[
                        models.PointStruct(
                            id=point_id,
                            vector=vector,
                            payload=payload
                        )
                    ]
                )
                return point_id
            except Exception as e:
                print(f"[QdrantService] Upsert error: {e}")

        # Local fallback in-memory store
        self._in_memory_store[point_id] = {"vector": vector, "payload": payload}
        return point_id

    def delete_note_vector(self, user_id: str, note_id: str):
        """Remove note vector ensuring user isolation"""
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"note-{user_id}-{note_id}"))
        if self.client and HAS_QDRANT_LIB:
            try:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=models.PointIdsList(points=[point_id])
                )
            except Exception as e:
                print(f"[QdrantService] delete_note_vector error: {e}")
        self._in_memory_store.pop(point_id, None)

    def upsert_document_chunks(self, user_id: str, document_id: str, title: str, chunks: List[Dict[str, Any]]) -> int:
        """Batch upsert chunks from an uploaded document"""
        if not chunks:
            return 0

        texts = [c["content"] for c in chunks]
        vectors = embedding_service.embed_batch(texts)

        points = []
        for i, chunk in enumerate(chunks):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"doc-{user_id}-{document_id}-{i}"))
            payload = {
                "point_id": point_id,
                "user_id": user_id,
                "source_id": document_id,
                "source_type": "document",
                "title": title,
                "content": chunk["content"],
                "chunk_index": i,
                "page_number": chunk.get("page_number"),
            }
            if HAS_QDRANT_LIB:
                points.append(models.PointStruct(id=point_id, vector=vectors[i], payload=payload))
            self._in_memory_store[point_id] = {"vector": vectors[i], "payload": payload}

        if self.client and HAS_QDRANT_LIB and points:
            try:
                # Upsert in batches of 100
                for start in range(0, len(points), 100):
                    batch = points[start:start + 100]
                    self.client.upsert(collection_name=self.collection_name, points=batch)
            except Exception as e:
                print(f"[QdrantService] Document chunk upsert error: {e}")

        return len(chunks)

    def delete_document_vectors(self, user_id: str, document_id: str):
        """Delete all chunk vectors for a document with user isolation"""
        if self.client and HAS_QDRANT_LIB:
            try:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                                models.FieldCondition(key="source_id", match=models.MatchValue(value=document_id)),
                            ]
                        )
                    )
                )
            except Exception as e:
                print(f"[QdrantService] delete_document_vectors error: {e}")

        # Clean fallback in-memory store
        to_del = [k for k, v in self._in_memory_store.items() if v["payload"].get("user_id") == user_id and v["payload"].get("source_id") == document_id]
        for k in to_del:
            self._in_memory_store.pop(k, None)

    def search(
        self,
        user_id: str,
        query: str,
        filter_type: str = "all",
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Strictly user-isolated semantic search"""
        if not topic_terms(query):
            return []
        query_vector = embedding_service.embed_text(query)
        candidate_limit = max(100, offset + limit)
        results: List[Dict[str, Any]] = []

        if self.client and HAS_QDRANT_LIB:
            must_conditions: List[models.Condition] = [
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))
            ]

            if filter_type == "notes":
                must_conditions.append(models.FieldCondition(key="source_type", match=models.MatchValue(value="note")))
            elif filter_type == "documents":
                must_conditions.append(models.FieldCondition(key="source_type", match=models.MatchValue(value="document")))

            search_filter = models.Filter(must=must_conditions)

            try:
                response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    query_filter=search_filter,
                    limit=candidate_limit,
                    with_payload=True,
                )
                for hit in response.points:
                    payload = hit.payload or {}
                    results.append({
                        "id": str(hit.id),
                        "sourceId": payload.get("source_id", ""),
                        "sourceType": payload.get("source_type", "note"),
                        "title": payload.get("title", "Untitled"),
                        "excerpt": payload.get("content", ""),
                        "score": round(float(hit.score), 4),
                        "pageNumber": payload.get("page_number"),
                        "tags": payload.get("tags", []),
                    })
                return relevant_hits(query, query_vector, results, limit, offset)
            except Exception as e:
                print(f"[QdrantService] Search error: {e}")

        # In-memory cosine search fallback
        import numpy as np
        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec) or 1.0

        scored = []
        for pid, data in self._in_memory_store.items():
            payload = data["payload"]
            if payload.get("user_id") != user_id:
                continue
            if filter_type == "notes" and payload.get("source_type") != "note":
                continue
            if filter_type == "documents" and payload.get("source_type") != "document":
                continue

            v = np.array(data["vector"], dtype=np.float32)
            v_norm = np.linalg.norm(v) or 1.0
            score = float(np.dot(q_vec, v) / (q_norm * v_norm))
            scored.append((score, pid, payload))

        scored.sort(key=lambda x: x[0], reverse=True)
        for score, pid, payload in scored[:candidate_limit]:
            results.append({
                "id": pid,
                "sourceId": payload.get("source_id", ""),
                "sourceType": payload.get("source_type", "note"),
                "title": payload.get("title", "Untitled"),
                "excerpt": payload.get("content", ""),
                "score": round(score, 4),
                "pageNumber": payload.get("page_number"),
                "tags": payload.get("tags", []),
            })

        return relevant_hits(query, query_vector, results, limit, offset)

qdrant_service = QdrantService()
