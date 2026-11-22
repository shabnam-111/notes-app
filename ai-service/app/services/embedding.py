import os
import hashlib
import numpy as np
from typing import List
from app.core.config import settings

class EmbeddingService:
    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER.lower()
        self.dimension = settings.VECTOR_DIMENSION
        self._st_model = None
        self._init_provider()

    def _init_provider(self):
        if self.provider == "local":
            try:
                from sentence_transformers import SentenceTransformer
                print(f"[EmbeddingService] Loading local model {settings.EMBEDDING_MODEL}...")
                self._st_model = SentenceTransformer(settings.EMBEDDING_MODEL)
                if hasattr(self._st_model, "get_embedding_dimension"):
                    self.dimension = self._st_model.get_embedding_dimension()
                else:
                    self.dimension = self._st_model.get_sentence_embedding_dimension()
                print(f"[EmbeddingService] Loaded local model (dimension={self.dimension})")
            except Exception as e:
                print(f"[EmbeddingService] Warning: Could not initialize SentenceTransformer ({e}). Falling back to deterministic dense vectorizer.")
                self._st_model = None

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding vector for a single string"""
        if not text or not text.strip():
            return [0.0] * self.dimension

        clean_text = text.strip()

        # 1. Local SentenceTransformer
        if self.provider == "local" and self._st_model is not None:
            try:
                embedding = self._st_model.encode(clean_text, normalize_embeddings=True)
                return embedding.tolist()
            except Exception as e:
                print(f"[EmbeddingService] Local encode error: {e}")

        # 2. Google Gemini Embedding
        if self.provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=clean_text,
                    task_type="retrieval_document"
                )
                return result['embedding']
            except Exception as e:
                print(f"[EmbeddingService] Gemini embedding error: {e}")

        # 3. OpenAI Embedding
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.embeddings.create(
                    input=clean_text,
                    model="text-embedding-3-small"
                )
                return response.data[0].embedding
            except Exception as e:
                print(f"[EmbeddingService] OpenAI embedding error: {e}")

        # 4. Deterministic Dense Normalized Fallback
        # Enables instant offline testing, unit verification, and CI without external network keys
        return self._deterministic_vector(clean_text, self.dimension)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch embedding generation"""
        if not texts:
            return []
        
        if self.provider == "local" and self._st_model is not None:
            try:
                embeddings = self._st_model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
                return embeddings.tolist()
            except Exception as e:
                print(f"[EmbeddingService] Local batch encode error: {e}")

        return [self.embed_text(t) for t in texts]

    def _deterministic_vector(self, text: str, dim: int) -> List[float]:
        """Produces a deterministic, normalized semantic-hash vector for testing/offline mode"""
        words = text.lower().split()
        vec = np.zeros(dim, dtype=np.float32)
        for i, word in enumerate(words):
            h = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
            pos = h % dim
            sign = 1.0 if ((h >> 8) & 1) else -1.0
            vec[pos] += sign / (1.0 + (i * 0.05))
        
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

embedding_service = EmbeddingService()
