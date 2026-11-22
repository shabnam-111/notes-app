'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pin,
  FileText,
  FileUp,
  Bot,
  Sparkles,
  ArrowRight,
  Folder as FolderIcon,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { useDocsStore } from '@/stores/docsStore';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatBytes } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notes, createNote, selectNote } = useNotesStore();
  const { documents, fetchDocuments } = useDocsStore();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const pinnedNotes = notes.filter((n) => n.isPinned && !n.isArchived);
  const recentNotes = notes.filter((n) => !n.isArchived).slice(0, 6);
  const recentDocs = documents.slice(0, 4);

  const handleOpenNote = (note: any) => {
    selectNote(note);
    router.push('/notes');
  };

  const handleQuickCreate = async () => {
    const note = await createNote();
    if (note) {
      router.push('/notes');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface via-surface-hover to-accent-subtle/40 border border-border rounded-2xl p-6 shadow-subtle">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.fullName || 'Architect'}
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Your personal AI knowledge vault holds <strong className="text-accent-light">{notes.length} notes</strong> and{' '}
            <strong className="text-accent-light">{documents.length} indexed documents</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickCreate}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-glow-purple"
          >
            <Plus className="w-4 h-4" />
            <span>Create Note</span>
          </button>
          <Link
            href="/chat"
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            <Bot className="w-4 h-4 text-accent" />
            <span>Query Knowledge</span>
          </Link>
        </div>
      </div>

      {/* Favorite / Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned Notes ({pinnedNotes.length})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleOpenNote(note)}
                className="group p-4 bg-surface hover:bg-surface-hover border border-border hover:border-accent/60 rounded-xl cursor-pointer transition shadow-subtle flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white group-hover:text-accent-light transition truncate">
                      {note.title}
                    </span>
                    <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {note.contentText || 'No additional content...'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(note.lastEditedAt)}</span>
                  </span>
                  {note.folder && (
                    <span className="bg-background border border-border px-2 py-0.5 rounded text-[10px] text-accent-light truncate max-w-[120px]">
                      {note.folder.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Recent Notes & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Notes (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-accent-light" />
              <span>Recent Notes</span>
            </span>
            <Link
              href="/notes"
              className="text-xs text-accent-light hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleOpenNote(note)}
                className="group p-4 bg-surface hover:bg-surface-hover border border-border hover:border-accent/60 rounded-xl cursor-pointer transition shadow-subtle flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-accent-light transition truncate">
                    {note.title}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                    {note.contentText || 'Empty note...'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border/40">
                  <span>{formatDate(note.lastEditedAt)}</span>
                  {note.tags && note.tags.length > 0 && (
                    <span className="text-[10px] text-accent-light font-mono truncate">
                      #{note.tags[0].name}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {recentNotes.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-text-muted">
                No notes created yet. Click "Create Note" to begin.
              </div>
            )}
          </div>
        </div>

        {/* Recently Uploaded Documents (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Documents Hub</span>
            </span>
            <Link
              href="/documents"
              className="text-xs text-accent-light hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between gap-3 shadow-subtle"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-accent-light flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-white truncate block">{doc.title}</span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {formatBytes(doc.fileSize)} • {doc.chunksCount} chunks
                    </span>
                  </div>
                </div>

                <div>
                  {doc.status === 'indexed' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  )}
                  {doc.status === 'processing' && (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>Parsing</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            {recentDocs.length === 0 && (
              <div className="py-12 text-center text-xs text-text-muted bg-surface/40 border border-dashed border-border rounded-xl p-4">
                No documents uploaded. Upload PDF or Word files to start asking questions against them.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
