import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Citation {
  sourceId: string;
  title: string;
  type: 'note' | 'document';
  pageNumber?: number;
  excerpt: string;
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<string | null>;
  selectSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  fetchSessions: async () => {
    try {
      const res = await api.get('/chat/sessions');
      const sessions = res.data.data;
      set({ sessions });
      if (!get().activeSessionId && sessions.length > 0) {
        get().selectSession(sessions[0].id);
      }
    } catch (err) {
      console.warn('Failed to fetch chat sessions', err);
    }
  },

  createSession: async (title = 'New Conversation') => {
    try {
      const res = await api.post('/chat/sessions', { title });
      const session = res.data.data;
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
        messages: [],
      }));
      return session.id;
    } catch (err) {
      console.error('Failed to create chat session', err);
      return null;
    }
  },

  selectSession: async (sessionId) => {
    set({ activeSessionId: sessionId, isLoading: true, error: null });
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      set({
        messages: res.data.data.messages || [],
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: 'Failed to load conversation' });
    }
  },

  sendMessage: async (content) => {
    let sessionId = get().activeSessionId;
    if (!sessionId) {
      sessionId = await get().createSession();
      if (!sessionId) return;
    }

    // Optimistic user message append
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, tempUserMsg],
      isSending: true,
      error: null,
    }));

    try {
      const res = await api.post(`/chat/sessions/${sessionId}/messages`, { message: content });
      const { userMessage, assistantMessage } = res.data;

      set((state) => ({
        messages: [
          ...state.messages.filter((m) => m.id !== tempUserMsg.id),
          userMessage,
          assistantMessage,
        ],
        isSending: false,
      }));

      get().fetchSessions();
    } catch (err: any) {
      set({
        isSending: false,
        error: err.response?.data?.error || 'Failed to generate response. Please try again.',
      });
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      set((state) => {
        const remaining = state.sessions.filter((s) => s.id !== sessionId);
        const nextActive = state.activeSessionId === sessionId ? remaining[0]?.id || null : state.activeSessionId;
        return {
          sessions: remaining,
          activeSessionId: nextActive,
          messages: nextActive ? state.messages : [],
        };
      });
      if (get().activeSessionId) {
        get().selectSession(get().activeSessionId!);
      }
    } catch (err) {
      console.error('Failed to delete chat session', err);
    }
  },
}));
