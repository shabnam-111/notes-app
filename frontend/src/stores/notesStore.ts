import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
  notesCount?: number;
}

export interface Note {
  id: string;
  title: string;
  contentJson: any;
  contentText: string;
  folderId?: string | null;
  folder?: Folder | null;
  isPinned: boolean;
  isArchived: boolean;
  version: number;
  lastEditedAt: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

interface NotesState {
  notes: Note[];
  activeNote: Note | null;
  folders: Folder[];
  tags: Tag[];
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'unsaved' | 'error' | 'conflict';
  saveError: string | null;
  hasUnsavedChanges: boolean;
  selectedFolderId: string | null;
  selectedTagId: string | null;

  fetchNotes: (params?: { folderId?: string; tagId?: string; search?: string; isArchived?: boolean }) => Promise<void>;
  fetchFolders: () => Promise<void>;
  fetchTags: () => Promise<void>;
  selectNote: (note: Note | null) => void;
  createNote: (folderId?: string | null) => Promise<Note | null>;
  updateNoteLocally: (fields: Partial<Note>) => void;
  saveActiveNote: () => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  togglePin: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  createFolder: (name: string, color?: string, parentId?: string | null) => Promise<Folder | null>;
  setSelectedFolder: (folderId: string | null) => void;
  setSelectedTag: (tagId: string | null) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNote: null,
  folders: [],
  tags: [],
  isLoading: false,
  saveStatus: 'idle',
  saveError: null,
  hasUnsavedChanges: false,
  selectedFolderId: null,
  selectedTagId: null,

  fetchNotes: async (params) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/notes', { params });
      const notes = res.data.data;
      set({ notes, isLoading: false });
      if (!get().activeNote && notes.length > 0) {
        set({ activeNote: notes[0] });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchFolders: async () => {
    try {
      const res = await api.get('/folders');
      set({ folders: res.data.data });
    } catch (err) {
      console.warn('Failed to fetch folders', err);
    }
  },

  fetchTags: async () => {
    try {
      const res = await api.get('/tags');
      set({ tags: res.data.data });
    } catch (err) {
      console.warn('Failed to fetch tags', err);
    }
  },

  selectNote: (note) => {
    set({
      activeNote: note,
      hasUnsavedChanges: false,
      saveStatus: 'saved',
      saveError: null,
    });
  },

  createNote: async (folderId) => {
    try {
      const res = await api.post('/notes', {
        title: 'Untitled Note',
        contentText: '',
        contentJson: null,
        folderId: folderId || get().selectedFolderId || null,
      });
      const newNote = res.data.data;
      set((state) => ({
        notes: [newNote, ...state.notes],
        activeNote: newNote,
        hasUnsavedChanges: false,
        saveStatus: 'saved',
      }));
      get().fetchFolders();
      return newNote;
    } catch (err) {
      console.error('Failed to create note', err);
      return null;
    }
  },

  updateNoteLocally: (fields) => {
    const { activeNote } = get();
    if (!activeNote) return;

    const updated = { ...activeNote, ...fields };
    set({
      activeNote: updated,
      hasUnsavedChanges: true,
      saveStatus: 'unsaved',
    });
  },

  saveActiveNote: async () => {
    const { activeNote } = get();
    if (!activeNote) return false;

    set({ saveStatus: 'saving', saveError: null });

    try {
      const res = await api.put(`/notes/${activeNote.id}`, {
        title: activeNote.title,
        contentJson: activeNote.contentJson,
        contentText: activeNote.contentText,
        folderId: activeNote.folderId,
        isPinned: activeNote.isPinned,
        isArchived: activeNote.isArchived,
        tags: activeNote.tags.map((t) => t.name),
        version: activeNote.version, // Concurrency lock
      });

      const updated = res.data.data;
      set((state) => ({
        activeNote: updated,
        notes: state.notes.map((n) => (n.id === updated.id ? updated : n)),
        hasUnsavedChanges: false,
        saveStatus: 'saved',
      }));
      return true;
    } catch (err: any) {
      const isConflict = err.response?.status === 409;
      set({
        saveStatus: isConflict ? 'conflict' : 'error',
        saveError: err.response?.data?.error || 'Failed to save note',
      });
      return false;
    }
  },

  deleteNote: async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      set((state) => {
        const remaining = state.notes.filter((n) => n.id !== id);
        return {
          notes: remaining,
          activeNote: state.activeNote?.id === id ? remaining[0] || null : state.activeNote,
        };
      });
      get().fetchFolders();
      return true;
    } catch (err) {
      console.error('Failed to delete note', err);
      return false;
    }
  },

  togglePin: async (id) => {
    try {
      const res = await api.post(`/notes/${id}/pin`);
      const { isPinned } = res.data;
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, isPinned } : n)),
        activeNote: state.activeNote?.id === id ? { ...state.activeNote, isPinned } : state.activeNote,
      }));
    } catch (err) {
      console.error('Failed to toggle pin', err);
    }
  },

  toggleArchive: async (id) => {
    try {
      const res = await api.post(`/notes/${id}/archive`);
      const { isArchived } = res.data;
      set((state) => {
        const remaining = state.notes.filter((n) => n.id !== id);
        return {
          notes: remaining,
          activeNote: state.activeNote?.id === id ? remaining[0] || null : state.activeNote,
        };
      });
    } catch (err) {
      console.error('Failed to toggle archive', err);
    }
  },

  createFolder: async (name, color = '#8B5CF6', parentId = null) => {
    try {
      const res = await api.post('/folders', { name, color, parentId });
      const folder = res.data.data;
      set((state) => ({ folders: [...state.folders, folder] }));
      return folder;
    } catch (err) {
      console.error('Failed to create folder', err);
      return null;
    }
  },

  setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),
  setSelectedTag: (tagId) => set({ selectedTagId: tagId }),
}));
