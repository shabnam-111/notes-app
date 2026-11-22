'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Lock, Mail, User, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { register, error } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await register(email, password, fullName);
    setLoading(false);
    if (success) {
      router.push('/');
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-glow-purple">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Create your MindVault</h1>
        <p className="text-xs text-text-secondary">Your AI-Powered Personal Knowledge Hub</p>
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
          <label className="text-xs font-semibold text-text-secondary">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Gurnoor Singh"
              className="w-full bg-background border border-border focus:border-accent rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none"
            />
          </div>
        </div>

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
          <label className="text-xs font-semibold text-text-secondary">Password (min 8 chars)</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={8}
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
        </button>
      </form>

      <div className="text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-light hover:underline font-semibold">
          Sign In
        </Link>
      </div>
    </div>
  );
}
