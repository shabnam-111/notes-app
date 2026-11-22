import axios from 'axios';
import { config } from '../config';

export interface SearchResultItem {
  id: string;
  sourceId: string;
  sourceType: 'note' | 'document';
  title: string;
  excerpt: string;
  score: number;
  pageNumber?: number;
  folderId?: string;
  tags?: string[];
}

export interface CitationItem {
  sourceId: string;
  title: string;
  type: 'note' | 'document';
  pageNumber?: number;
  excerpt: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  citations: CitationItem[];
  model: string;
  fromKnowledgeBase: boolean;
}

export interface NoteAnalysisResponse {
  category: string;
  tags: string[];
  description: string;
  keywords: string[];
  relatedNoteIds: string[];
}

const client = axios.create({
  baseURL: config.aiServiceUrl,
  timeout: 45000, // 45s for LLM / OCR tasks
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiServiceClient = {
  /**
   * Indexes or re-indexes note content into Qdrant with user isolation payload
   */
  async indexNote(params: {
    userId: string;
    noteId: string;
    title: string;
    contentText: string;
    tags?: string[];
  }): Promise<{ success: boolean; pointId?: string }> {
    try {
      const response = await client.post('/api/ai/index-note', params);
      return response.data;
    } catch (error: any) {
      console.error('[AI Client] indexNote failed:', error.response?.data || error.message);
      return { success: false };
    }
  },

  /**
   * Deletes note vector from vector store
   */
  async deleteNoteVector(userId: string, noteId: string): Promise<boolean> {
    try {
      await client.post('/api/ai/delete-note-vector', { userId, noteId });
      return true;
    } catch (error: any) {
      console.error('[AI Client] deleteNoteVector failed:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Dispatches document processing to Python service
   */
  async processDocument(params: {
    userId: string;
    documentId: string;
    filePath: string;
    fileType: string;
    filename: string;
  }): Promise<{ success: boolean; chunksCount?: number; error?: string }> {
    try {
      const response = await client.post('/api/ai/process-document', params);
      return response.data;
    } catch (error: any) {
      console.error('[AI Client] processDocument failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  /**
   * Deletes all vector embeddings associated with a document
   */
  async deleteDocumentVectors(userId: string, documentId: string): Promise<boolean> {
    try {
      await client.post('/api/ai/delete-doc-vectors', { userId, documentId });
      return true;
    } catch (error: any) {
      console.error('[AI Client] deleteDocumentVectors failed:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Performs semantic & hybrid search strictly scoped to userId
   */
  async search(params: {
    userId: string;
    query: string;
    filterType?: 'all' | 'notes' | 'documents';
    folderId?: string;
    tagId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: SearchResultItem[]; total: number }> {
    try {
      const response = await client.post('/api/ai/search', params);
      return response.data;
    } catch (error: any) {
      console.error('[AI Client] search failed:', error.response?.data || error.message);
      return { results: [], total: 0 };
    }
  },

  /**
   * Executes RAG pipeline for conversational question answering
   */
  async chatWithNotes(params: {
    userId: string;
    message: string;
    history: Array<{ role: string; content: string }>;
  }): Promise<ChatResponse> {
    try {
      const response = await client.post('/api/ai/rag/chat', params);
      return response.data;
    } catch (error: any) {
      console.error('[AI Client] chatWithNotes failed:', error.response?.data || error.message);
      return {
        answer: 'The AI assistant is temporarily unavailable or encountered a connection error. Please verify the AI service status.',
        citations: [],
        model: 'unavailable',
        fromKnowledgeBase: false,
      };
    }
  },

  /**
   * Analyzes note title and body for auto-tagging, categorizing, and summarization
   */
  async analyzeNote(params: {
    userId: string;
    title: string;
    contentText: string;
    existingTags?: string[];
  }): Promise<NoteAnalysisResponse> {
    try {
      const response = await client.post('/api/ai/analyze-note', params);
      return response.data;
    } catch (error: any) {
      console.error('[AI Client] analyzeNote failed:', error.response?.data || error.message);
      return {
        category: 'General',
        tags: [],
        description: '',
        keywords: [],
        relatedNoteIds: [],
      };
    }
  },
};
