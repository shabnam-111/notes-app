'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, ArrowRight, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      router.push('/');
    }
  };

  const handleFillDemo = () => {
    setEmail('demo@mindvault.ai');
    setPassword('Password123!');
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-glow-purple">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Sign in to MindVault</h1>
        <p className="text-xs text-text-secondary">AI-Powered Personal Knowledge Management System</p>
      </div>

      {error && (
        <div className="bg-red-950/70 border border-red-800 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-secondary">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full bg-background border border-border focus:border-accent rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-secondary">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background border border-border focus:border-accent rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 shadow-glow-purple disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
        </button>
      </form>

      {/* 1-Click Demo Fill */}
      <div className="pt-2 border-t border-border/60 text-center">
        <button
          type="button"
          onClick={handleFillDemo}
          className="text-xs text-accent-light hover:underline font-medium"
        >
          Fill Demo Account Credentials (demo@mindvault.ai)
        </button>
      </div>

      <div className="text-center text-xs text-text-muted">
        Don't have an account?{' '}
        <Link href="/register" className="text-accent-light hover:underline font-semibold">
          Create Account
        </Link>
      </div>
    </div>
  );
}
