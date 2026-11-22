'use client';

import React, { useState } from 'react';
import { Search, FileText, FileUp, Sparkles, Loader2, ArrowRight, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotesStore } from '@/stores/notesStore';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();
  const { notes, selectNote, folders, tags } = useNotesStore();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'documents'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const res = await api.post('/search', {
        query,
        filterType,
        folderId: selectedFolder || undefined,
        limit: 20,
      });
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Search error', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResult = (item: any) => {
    if (item.sourceType === 'note') {
      const found = notes.find((n) => n.id === item.sourceId);
      if (found) selectNote(found);
      router.push('/notes');
    } else {
      router.push('/documents');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background max-w-5xl mx-auto w-full">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span>Semantic & Hybrid Knowledge Search</span>
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Perform high-dimensional vector search across your notes and document chunks. Finds conceptually matching material even without exact keyword matches.
        </p>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-accent-light absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask or search semantically (e.g. 'How does container orchestration work?')..."
              className="w-full bg-surface border border-border focus:border-accent rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none shadow-subtle"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-glow-purple"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg">
            {(['all', 'notes', 'documents'] as const).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition ${
                  filterType === type ? 'bg-accent text-white' : 'text-text-muted hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {folders.length > 0 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="bg-surface border border-border text-text-secondary rounded-lg px-3 py-1.5 text-xs outline-none focus:border-accent"
            >
              <option value="">All Folders</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>

      {/* Results Listing */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Search Results ({results.length})
          </span>
        </div>

        <div className="space-y-2.5">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenResult(item)}
              className="group p-4 bg-surface hover:bg-surface-hover border border-border hover:border-accent/60 rounded-xl cursor-pointer transition shadow-subtle space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  {item.sourceType === 'note' ? (
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <FileUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-white group-hover:text-accent-light transition truncate">
                    {item.title}
                  </span>
                  {item.pageNumber && (
                    <span className="text-[11px] text-text-muted">Page {item.pageNumber}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded-full">
                    {Math.round(item.score * 100)}% relevance
                  </span>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-light transition" />
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed bg-background/50 p-3 rounded-lg border border-border/40 font-mono">
                "{item.excerpt}"
              </p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-background text-accent-light border border-border px-2 py-0.5 rounded-full font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!isLoading && query && results.length === 0 && (
            <div className="py-16 text-center text-xs text-text-muted bg-surface/30 rounded-xl border border-dashed border-border p-6">
              No matching knowledge items found. Try asking in natural language or indexing more notes and documents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
