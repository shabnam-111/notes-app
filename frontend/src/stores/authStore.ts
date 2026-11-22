import { create } from 'zustand';
import { api } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('mindvault_token') : null,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken } = res.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mindvault_token', accessToken);
      }
      set({ user, token: accessToken, isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Login failed. Please check credentials.',
        isLoading: false,
      });
      return false;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', { email, password, fullName });
      const { user, accessToken } = res.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mindvault_token', accessToken);
      }
      set({ user, token: accessToken, isLoading: false });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Registration failed. Please try again.',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mindvault_token');
    }
    set({ user: null, token: null });
  },

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindvault_token') : null;
      if (!token) {
        set({ user: null, isLoading: false });
        return;
      }
      const res = await api.get('/auth/me');
      set({ user: res.data.user, token, isLoading: false });
    } catch (err) {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
