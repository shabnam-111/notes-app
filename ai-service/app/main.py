import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.schemas.ai import (
    IndexNoteRequest,
    DeleteNoteVectorRequest,
    ProcessDocumentRequest,
    DeleteDocVectorsRequest,
    SearchRequest,
    SearchResponse,
    RAGChatRequest,
    RAGChatResponse,
    AnalyzeNoteRequest,
    AnalyzeNoteResponse,
)
from app.services.qdrant_client import qdrant_service
from app.services.parser import DocumentParser
from app.services.chunker import chunker
from app.services.rag import rag_service
from app.services.tagger import tagger_service

app = FastAPI(
    title="MindVault AI Service",
    description="Vector search, RAG chat, document parsing, and auto-tagging microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "mindvault-ai-service",
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "llm_provider": settings.LLM_PROVIDER,
        "qdrant_collection": settings.QDRANT_COLLECTION,
    }

@app.post("/api/ai/index-note")
def index_note(req: IndexNoteRequest):
    try:
        point_id = qdrant_service.upsert_note(
            user_id=req.userId,
            note_id=req.noteId,
            title=req.title,
            content=req.contentText,
            tags=req.tags or []
        )
        return {"success": True, "pointId": point_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to index note vector: {str(e)}"
        )

@app.post("/api/ai/delete-note-vector")
def delete_note_vector(req: DeleteNoteVectorRequest):
    try:
        qdrant_service.delete_note_vector(user_id=req.userId, note_id=req.noteId)
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete note vector: {str(e)}"
        )

@app.post("/api/ai/process-document")
def process_document(req: ProcessDocumentRequest):
    try:
        if not os.path.exists(req.filePath):
            raise HTTPException(status_code=404, detail=f"File not found on server: {req.filePath}")

        # 1. Parse document pages
        pages = DocumentParser.parse_file(file_path=req.filePath, file_type=req.fileType)

        # 2. Chunk text recursively with page preservation
        chunks = chunker.chunk_document(pages)

        # 3. Vectorize and index into Qdrant with user_id payload
        inserted_count = qdrant_service.upsert_document_chunks(
            user_id=req.userId,
            document_id=req.documentId,
            title=req.filename,
            chunks=chunks
        )

        return {
            "success": True,
            "documentId": req.documentId,
            "chunksCount": inserted_count,
            "pagesCount": len(pages)
        }
    except Exception as e:
        print(f"[Main API] Document processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {str(e)}"
        )

@app.post("/api/ai/delete-doc-vectors")
def delete_document_vectors(req: DeleteDocVectorsRequest):
    try:
        qdrant_service.delete_document_vectors(user_id=req.userId, document_id=req.documentId)
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document vectors: {str(e)}"
        )

@app.post("/api/ai/search", response_model=SearchResponse)
def search_knowledge(req: SearchRequest):
    try:
        results = qdrant_service.search(
            user_id=req.userId,
            query=req.query,
            filter_type=req.filterType or "all",
            limit=req.limit or 10,
            offset=req.offset or 0
        )
        return SearchResponse(
            success=True,
            total=len(results),
            results=results
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@app.post("/api/ai/rag/chat", response_model=RAGChatResponse)
def chat_with_knowledge(req: RAGChatRequest):
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history or []]
        res = rag_service.chat(
            user_id=req.userId,
            message=req.message,
            history=history_dicts
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG Chat failed: {str(e)}"
        )

@app.post("/api/ai/analyze-note", response_model=AnalyzeNoteResponse)
def analyze_note(req: AnalyzeNoteRequest):
    try:
        analysis = tagger_service.analyze(
            user_id=req.userId,
            title=req.title,
            content=req.contentText,
            existing_tags=req.existingTags or []
        )
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Note analysis failed: {str(e)}"
        )
