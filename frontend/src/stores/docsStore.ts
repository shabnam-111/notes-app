import { create } from 'zustand';
import { api } from '@/lib/api';

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string | null;
  chunksCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DocsState {
  documents: DocumentItem[];
  isLoading: boolean;
  isUploading: boolean;
  uploadError: string | null;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  pollProcessingStatus: () => void;
}

export const useDocsStore = create<DocsState>((set, get) => ({
  documents: [],
  isLoading: false,
  isUploading: false,
  uploadError: null,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/documents');
      set({ documents: res.data.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  uploadDocument: async (file) => {
    set({ isUploading: true, uploadError: null });
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ isUploading: false });
      await get().fetchDocuments();
      get().pollProcessingStatus();
      return true;
    } catch (err: any) {
      set({
        isUploading: false,
        uploadError: err.response?.data?.error || 'Document upload failed',
      });
      return false;
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete document', err);
      return false;
    }
  },

  pollProcessingStatus: () => {
    const interval = setInterval(async () => {
      const res = await api.get('/documents');
      const docs: DocumentItem[] = res.data.data;
      set({ documents: docs });

      const anyProcessing = docs.some(
        (d) => d.status === 'uploaded' || d.status === 'processing'
      );
      if (!anyProcessing) {
        clearInterval(interval);
      }
    }, 2500);

    // Stop polling after 45s safety limit
    setTimeout(() => clearInterval(interval), 45000);
  },
}));
