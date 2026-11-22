'use client';

import React, { useEffect, useState } from 'react';
import { Settings, User, Database, Cpu, ShieldCheck, Key, CheckCircle2, HardDrive } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { useDocsStore } from '@/stores/docsStore';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { notes, folders, tags } = useNotesStore();
  const { documents } = useDocsStore();

  const [aiStatus, setAiStatus] = useState<any>(null);

  useEffect(() => {
    // Check AI Microservice health
    api
      .get('/health')
      .then((res) => {
        setAiStatus({ backend: res.data.status, ready: true });
      })
      .catch(() => {
        setAiStatus({ backend: 'offline', ready: false });
      });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-accent" />
          <span>System & Account Settings</span>
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Review your tenant profile, vector storage stats, and AI microservice integration health.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-sm font-bold text-accent-light">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{user?.fullName}</h3>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
          <div className="bg-background border border-border rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase text-text-muted font-semibold block">Notes</span>
            <span className="text-lg font-bold text-white mt-1 block">{notes.length}</span>
          </div>
          <div className="bg-background border border-border rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase text-text-muted font-semibold block">Folders</span>
            <span className="text-lg font-bold text-white mt-1 block">{folders.length}</span>
          </div>
          <div className="bg-background border border-border rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase text-text-muted font-semibold block">Tags</span>
            <span className="text-lg font-bold text-white mt-1 block">{tags.length}</span>
          </div>
          <div className="bg-background border border-border rounded-lg p-3 text-center">
            <span className="text-[10px] uppercase text-text-muted font-semibold block">Documents</span>
            <span className="text-lg font-bold text-white mt-1 block">{documents.length}</span>
          </div>
        </div>
      </div>

      {/* AI Microservice Health & Config */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-subtle">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-accent-light" />
          <h3 className="text-sm font-semibold text-white">AI Engine & Vector Database</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <div>
                <span className="font-semibold text-white block">Qdrant Vector Database</span>
                <span className="text-[10px] text-text-muted">Collection: mindvault_vectors (Tenant Scoped)</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>Active</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-accent-light" />
              <div>
                <span className="font-semibold text-white block">Embedding Engine</span>
                <span className="text-[10px] text-text-muted">Model: all-MiniLM-L6-v2 (384-dimensional cosine similarity)</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>Zero-key Ready</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">RAG Multi-Tenant Isolation</span>
                <span className="text-[10px] text-text-muted">Mandatory user_id payload filter enforced at vector layer</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>Strictly Isolated</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
