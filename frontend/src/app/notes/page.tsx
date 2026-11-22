'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Pin,
  Archive,
  Folder as FolderIcon,
  Filter,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useNotesStore } from '@/stores/notesStore';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { formatDate } from '@/lib/utils';

export default function NotesPage() {
  const {
    notes,
    activeNote,
    selectNote,
    createNote,
    selectedFolderId,
    selectedTagId,
    folders,
    tags,
  } = useNotesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterArchived, setFilterArchived] = useState(false);

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (filterArchived ? !n.isArchived : n.isArchived) return false;
    if (selectedFolderId && n.folderId !== selectedFolderId) return false;
    if (selectedTagId && !n.tags.some((t) => t.id === selectedTagId)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.contentText.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Notes List Column */}
      <div className="w-80 border-r border-border bg-surface flex flex-col h-full flex-shrink-0">
        {/* Search & Actions Header */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {filterArchived ? 'Archived Notes' : 'All Notes'} ({filteredNotes.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterArchived(!filterArchived)}
                className={`p-1.5 rounded transition ${
                  filterArchived ? 'bg-accent/20 text-accent-light' : 'text-text-muted hover:text-white'
                }`}
                title={filterArchived ? 'Show Active Notes' : 'Show Archive'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => createNote()}
                className="bg-accent hover:bg-accent-hover text-white p-1.5 rounded transition"
                title="Create Note"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter notes..."
              className="w-full bg-background border border-border focus:border-accent rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable Notes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map((note) => {
            const isActive = activeNote?.id === note.id;
            return (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`p-3 rounded-xl cursor-pointer transition flex flex-col space-y-1.5 border ${
                  isActive
                    ? 'bg-accent-subtle/80 border-accent/50 shadow-sm'
                    : 'bg-background hover:bg-surface-hover border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isActive ? 'text-white' : 'text-text-primary'
                    }`}
                  >
                    {note.title || 'Untitled Note'}
                  </span>
                  {note.isPinned && (
                    <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                  {note.contentText || 'No additional text'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                  <span>{formatDate(note.lastEditedAt)}</span>
                  {note.folder && (
                    <span className="text-accent-light font-mono truncate max-w-[100px]">
                      {note.folder.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="py-16 text-center text-xs text-text-muted space-y-2">
              <FileText className="w-6 h-6 text-text-muted mx-auto" />
              <div>No notes match your filter.</div>
            </div>
          )}
        </div>
      </div>

      {/* Note Editor View */}
      {activeNote ? (
        <TipTapEditor key={activeNote.id} note={activeNote} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted space-y-3">
          <FileText className="w-10 h-10 text-border" />
          <h3 className="text-sm font-medium text-white">No note selected</h3>
          <p className="text-xs text-text-muted max-w-xs">
            Select an existing note from the list or create a new one to begin writing.
          </p>
          <button
            onClick={() => createNote()}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Note</span>
          </button>
        </div>
      )}
    </div>
  );
}
