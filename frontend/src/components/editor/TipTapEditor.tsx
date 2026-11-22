'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  FileCode,
  Table as TableIcon,
  Link as LinkIcon,
  Pin,
  Archive,
  Trash2,
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  Folder as FolderIcon,
  Tag as TagIcon,
  AlertTriangle,
} from 'lucide-react';

import { useNotesStore, Note } from '@/stores/notesStore';
import { AISuggestionsPanel } from './AISuggestionsPanel';
import { formatDate } from '@/lib/utils';

interface TipTapEditorProps {
  note: Note;
}

export function TipTapEditor({ note }: TipTapEditorProps) {
  const {
    updateNoteLocally,
    saveActiveNote,
    deleteNote,
    togglePin,
    toggleArchive,
    saveStatus,
    saveError,
    folders,
  } = useNotesStore();

  const [distractionFree, setDistractionFree] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [title, setTitle] = useState(note.title);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync title when active note changes
  useEffect(() => {
    setTitle(note.title);
  }, [note.id]);

  // Warn user about unsaved changes on tab close / navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useNotesStore.getState().hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved note changes!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Initialize TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing or type Markdown shortcuts like # Heading, - [ ] Checklist, > Quote...',
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: note.contentJson || (note.contentText ? `<p>${note.contentText}</p>` : ''),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const text = editor.getText();
      updateNoteLocally({ contentJson: json, contentText: text });

      // Debounced Autosave (700ms)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        saveActiveNote();
      }, 700);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[450px] text-text-primary px-8 py-6 max-w-3xl mx-auto',
      },
    },
  });

  // Re-populate editor content when selected note switches
  useEffect(() => {
    if (editor && note) {
      const currentJson = JSON.stringify(editor.getJSON());
      const noteJson = JSON.stringify(note.contentJson);
      if (currentJson !== noteJson) {
        editor.commands.setContent(
          note.contentJson || (note.contentText ? `<p>${note.contentText}</p>` : ''),
          false
        );
      }
    }
  }, [note.id, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateNoteLocally({ title: newTitle });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveActiveNote();
    }, 700);
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className="p-8 text-xs text-text-muted">Loading editor...</div>;
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative bg-background">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Editor Top Navigation & Action Bar */}
        <div className="h-12 border-b border-border bg-surface px-6 flex items-center justify-between flex-shrink-0">
          {/* Metadata breadcrumbs */}
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            {note.folder && (
              <span className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded text-[11px]">
                <FolderIcon className="w-3 h-3 text-accent-light" />
                <span>{note.folder.name}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-text-muted text-[11px]">
              <Calendar className="w-3 h-3" />
              <span>Edited {formatDate(note.lastEditedAt)}</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* AI Assistant Analyzer */}
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                showAIPanel
                  ? 'bg-accent text-white shadow-glow-purple'
                  : 'bg-accent/15 border border-accent/40 text-accent-light hover:bg-accent/25'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Auto-Tagger</span>
            </button>

            {/* Pin note */}
            <button
              onClick={() => togglePin(note.id)}
              className={`p-1.5 rounded transition ${
                note.isPinned ? 'text-amber-400 bg-amber-400/10' : 'text-text-muted hover:text-white'
              }`}
              title={note.isPinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Archive note */}
            <button
              onClick={() => toggleArchive(note.id)}
              className={`p-1.5 rounded transition ${
                note.isArchived ? 'text-purple-400 bg-purple-400/10' : 'text-text-muted hover:text-white'
              }`}
              title={note.isArchived ? 'Restore from archive' : 'Archive note'}
            >
              <Archive className="w-4 h-4" />
            </button>

            {/* Distraction-Free Toggle */}
            <button
              onClick={() => setDistractionFree(!distractionFree)}
              className="p-1.5 rounded text-text-muted hover:text-white transition"
              title={distractionFree ? 'Exit focus mode' : 'Distraction-free mode'}
            >
              {distractionFree ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Delete Note */}
            <button
              onClick={() => {
                if (window.confirm('Delete this note permanently?')) {
                  deleteNote(note.id);
                }
              }}
              className="p-1.5 rounded text-text-muted hover:text-red-400 transition"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Edit Conflict Warning Banner (Optimistic Concurrency) */}
        {saveStatus === 'conflict' && (
          <div className="bg-red-950/80 border-b border-red-800 text-red-200 px-6 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>
                <strong>Concurrent Modification Warning:</strong> {saveError}
              </span>
            </div>
            <button
              onClick={() => saveActiveNote()}
              className="bg-red-800 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
            >
              Force Overwrite
            </button>
          </div>
        )}

        {/* Formatting Toolbar */}
        {!distractionFree && (
          <div className="border-b border-border bg-surface-muted/50 px-6 py-1.5 flex flex-wrap items-center gap-1 text-xs">
            {/* Headings */}
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('heading', { level: 1 }) ? 'text-accent-light font-bold bg-surface' : 'text-text-secondary'
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('heading', { level: 2 }) ? 'text-accent-light font-bold bg-surface' : 'text-text-secondary'
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('heading', { level: 3 }) ? 'text-accent-light font-bold bg-surface' : 'text-text-secondary'
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-border mx-1" />

            {/* Inline styles */}
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('bold') ? 'text-accent-light font-bold bg-surface' : 'text-text-secondary'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('italic') ? 'text-accent-light italic bg-surface' : 'text-text-secondary'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('underline') ? 'text-accent-light underline bg-surface' : 'text-text-secondary'
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('strike') ? 'text-accent-light line-through bg-surface' : 'text-text-secondary'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('code') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-border mx-1" />

            {/* Lists & Tasks */}
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('bulletList') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('orderedList') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('taskList') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Checklist"
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <span className="w-px h-4 bg-border mx-1" />

            {/* Blocks */}
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('blockquote') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('codeBlock') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Code Block"
            >
              <FileCode className="w-4 h-4" />
            </button>
            <button
              onClick={setLink}
              className={`p-1.5 rounded hover:bg-surface-hover ${
                editor.isActive('link') ? 'text-accent-light bg-surface' : 'text-text-secondary'
              }`}
              title="Hyperlink"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              className="p-1.5 rounded hover:bg-surface-hover text-text-secondary"
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Document Editor Scrollable Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 pt-8">
            {/* Note Title Input */}
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Note"
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-text-muted focus:outline-none tracking-tight pb-3 border-b border-border/40"
            />

            {/* Note Tags Badges */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 mb-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 bg-surface border border-border text-accent-light text-xs px-2 py-0.5 rounded-full"
                  >
                    <span>#</span>
                    <span>{tag.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TipTap Rich Text Area */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AI Intelligence Drawer */}
      {showAIPanel && (
        <AISuggestionsPanel note={note} onClose={() => setShowAIPanel(false)} />
      )}
    </div>
  );
}
