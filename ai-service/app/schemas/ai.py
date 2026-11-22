from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class IndexNoteRequest(BaseModel):
    userId: str
    noteId: str
    title: str
    contentText: str
    tags: Optional[List[str]] = []

class DeleteNoteVectorRequest(BaseModel):
    userId: str
    noteId: str

class ProcessDocumentRequest(BaseModel):
    userId: str
    documentId: str
    filePath: str
    fileType: str  # pdf, docx, txt, md
    filename: str

class DeleteDocVectorsRequest(BaseModel):
    userId: str
    documentId: str

class SearchRequest(BaseModel):
    userId: str
    query: str
    filterType: Optional[Literal["all", "notes", "documents"]] = "all"
    folderId: Optional[str] = None
    tagId: Optional[str] = None
    limit: Optional[int] = 10
    offset: Optional[int] = 0

class SearchResultItem(BaseModel):
    id: str
    sourceId: str
    sourceType: Literal["note", "document"]
    title: str
    excerpt: str
    score: float
    pageNumber: Optional[int] = None
    folderId: Optional[str] = None
    tags: Optional[List[str]] = []

class SearchResponse(BaseModel):
    success: bool = True
    total: int
    results: List[SearchResultItem]

class ChatMessage(BaseModel):
    role: str
    content: str

class RAGChatRequest(BaseModel):
    userId: str
    message: str
    history: Optional[List[ChatMessage]] = []

class CitationItem(BaseModel):
    sourceId: str
    title: str
    type: Literal["note", "document"]
    pageNumber: Optional[int] = None
    excerpt: str
    score: float

class RAGChatResponse(BaseModel):
    answer: str
    citations: List[CitationItem]
    model: str
    fromKnowledgeBase: bool

class AnalyzeNoteRequest(BaseModel):
    userId: str
    title: str
    contentText: str
    existingTags: Optional[List[str]] = []

class AnalyzeNoteResponse(BaseModel):
    category: str
    tags: List[str]
    description: str
    keywords: List[str]
    relatedNoteIds: List[str] = []
