'use client';

import React, { useState } from 'react';
import { Sparkles, Check, X, Tag as TagIcon, Folder, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotesStore, Note } from '@/stores/notesStore';

interface AISuggestionsPanelProps {
  note: Note;
  onClose: () => void;
}

export function AISuggestionsPanel({ note, onClose }: AISuggestionsPanelProps) {
  const { fetchNotes, fetchFolders, fetchTags, selectNote } = useNotesStore();

  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    category: string;
    suggestedTags: string[];
    description: string;
    keywords: string[];
    relatedNotes: Array<{ id: string; title: string }>;
  } | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    setAppliedSuccess(false);
    try {
      const res = await api.post('/ai/analyze-note', {
        noteId: note.id,
        title: note.title,
        contentText: note.contentText,
      });
      const data = res.data.data;
      setAnalysis(data);
      setSelectedTags(data.suggestedTags || []);
    } catch (err) {
      console.error('Failed to run AI analysis', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTagSelection = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const applySuggestions = async () => {
    if (!analysis) return;
    setIsApplying(true);
    try {
      const res = await api.post('/ai/accept-tags', {
        noteId: note.id,
        tags: selectedTags,
        category: analysis.category,
      });
      setAppliedSuccess(true);
      await Promise.all([fetchNotes(), fetchFolders(), fetchTags()]);
      selectNote(res.data.data);
    } catch (err) {
      console.error('Failed to apply tags', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="w-80 border-l border-border bg-surface h-full flex flex-col z-10 flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm text-white">AI Intelligence</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-white p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-5">
        {!analysis && !isLoading && (
          <div className="text-center py-8 space-y-3">
            <Sparkles className="w-8 h-8 text-accent mx-auto animate-pulse" />
            <h4 className="text-sm font-medium text-white">Automatic Tagging & Categorization</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Analyze this note to automatically identify its subject, extract technical entities, suggest tags, and discover related notes in your vault.
            </p>
            <button
              onClick={runAnalysis}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-2 px-3 rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Note with AI</span>
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <p className="text-xs text-text-secondary">Extracting entities and concepts...</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Suggested Category */}
            <div className="bg-background border border-border rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                <Folder className="w-3 h-3 text-accent-light" />
                <span>Suggested Category</span>
              </span>
              <div className="text-xs font-semibold text-white">{analysis.category}</div>
            </div>

            {/* AI Summary Description */}
            <div className="bg-background border border-border rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                AI Summary
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">
                {analysis.description}
              </p>
            </div>

            {/* Suggested Tags with Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                  <TagIcon className="w-3 h-3 text-accent-light" />
                  <span>Suggested Tags</span>
                </span>
                <span className="text-[10px] text-text-muted">Click to toggle</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.suggestedTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTagSelection(tag)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                        isSelected
                          ? 'bg-accent text-white shadow-sm'
                          : 'bg-background text-text-muted border border-border hover:border-accent'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3" /> : <span>+</span>}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key Technical Entities */}
            {analysis.keywords.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Technical Entities
                </span>
                <div className="flex flex-wrap gap-1">
                  {analysis.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="bg-surface-muted text-text-secondary text-[11px] px-2 py-0.5 rounded font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Existing Notes */}
            {analysis.relatedNotes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-accent-light" />
                  <span>Related Vault Notes</span>
                </span>
                <div className="space-y-1">
                  {analysis.relatedNotes.map((relNote) => (
                    <button
                      key={relNote.id}
                      onClick={() => {
                        const fullNote = useNotesStore.getState().notes.find((n) => n.id === relNote.id);
                        if (fullNote) selectNote(fullNote);
                      }}
                      className="w-full flex items-center justify-between text-left bg-background border border-border hover:border-accent/60 p-2 rounded text-xs text-text-secondary hover:text-white transition group"
                    >
                      <span className="truncate">{relNote.title}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted group-hover:text-accent-light flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Action Buttons */}
            <div className="pt-2">
              {appliedSuccess ? (
                <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg p-2.5 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Tags & category successfully applied!</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    disabled={isApplying || selectedTags.length === 0}
                    onClick={applySuggestions}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2 px-3 rounded-lg text-xs font-semibold transition"
                  >
                    {isApplying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Apply Selected ({selectedTags.length})</span>
                  </button>
                  <button
                    onClick={runAnalysis}
                    className="p-2 border border-border hover:border-accent text-text-muted hover:text-white rounded-lg transition"
                    title="Re-run analysis"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
