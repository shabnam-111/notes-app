'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Sparkles, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const { saveStatus, hasUnsavedChanges } = useNotesStore();

  return (
    <header className="h-14 border-b border-border bg-surface/50 backdrop-blur-md px-6 flex items-center justify-between z-10">
      {/* Search Bar Trigger */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between bg-background border border-border hover:border-accent/60 rounded-lg px-3 py-1.5 text-xs text-text-muted transition shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-light transition" />
            <span>Search notes, documents, and ideas semantically...</span>
          </div>
          <kbd className="hidden sm:inline-block bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Action shortcuts & Save status */}
      <div className="flex items-center gap-3">
        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}
          {hasUnsavedChanges && saveStatus !== 'saving' && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === 'conflict' && (
            <span className="flex items-center gap-1 text-red-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Edit conflict</span>
            </span>
          )}
        </div>

        {/* AI Chat Shortcut Pill */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 bg-accent/15 border border-accent/30 hover:border-accent text-accent-light px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Ask AI Assistant</span>
        </Link>
      </div>
    </header>
  );
}
