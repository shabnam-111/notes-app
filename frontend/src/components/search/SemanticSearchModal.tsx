'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, FileUp, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotesStore } from '@/stores/notesStore';
import { useRouter } from 'next/navigation';

interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  sourceId: string;
  sourceType: 'note' | 'document';
  title: string;
  excerpt: string;
  score: number;
  pageNumber?: number;
  tags?: string[];
}

export function SemanticSearchModal({ isOpen, onClose }: SemanticSearchModalProps) {
  const router = useRouter();
  const { notes, selectNote } = useNotesStore();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'notes' | 'documents'>('all');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut listener: Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const executeSearch = async (searchQuery: string, type: 'all' | 'notes' | 'documents') => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/search', {
        query: searchQuery,
        filterType: type,
        limit: 10,
      });
      setResults(res.data.results || []);
    } catch (err) {
      console.error('Search error', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      executeSearch(val, filterType);
    }, 350);
  };

  const handleFilterChange = (type: 'all' | 'notes' | 'documents') => {
    setFilterType(type);
    executeSearch(query, type);
  };

  const handleResultClick = (item: SearchItem) => {
    onClose();
    if (item.sourceType === 'note') {
      const targetNote = notes.find((n) => n.id === item.sourceId);
      if (targetNote) {
        selectNote(targetNote);
      }
      router.push('/notes');
    } else {
      router.push('/documents');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-accent-light flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={handleQueryChange}
            placeholder="Search concepts, questions, or ideas (e.g. 'How does container orchestration work?')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-text-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="text-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs bg-background border border-border text-text-muted px-2 py-0.5 rounded font-mono">
            ESC
          </span>
        </div>

        {/* Filter Chips */}
        <div className="px-4 py-2 border-b border-border/60 bg-background/50 flex items-center gap-2 text-xs">
          <span className="text-[11px] text-text-muted font-medium">Filter:</span>
          {(['all', 'notes', 'documents'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${
                filterType === type
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-muted hover:text-white border border-border'
              }`}
            >
              {type}
            </button>
          ))}
          {isLoading && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-accent-light">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Embedding & searching vectors...</span>
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleResultClick(item)}
              className="group p-3 bg-background hover:bg-surface-hover border border-border hover:border-accent/60 rounded-lg cursor-pointer transition space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  {item.sourceType === 'note' ? (
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <FileUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                  {item.pageNumber && (
                    <span className="text-[10px] text-text-muted">Page {item.pageNumber}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-1.5 py-0.2 rounded">
                    {Math.round(item.score * 100)}% match
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-light transition" />
                </div>
              </div>

              {/* Excerpt */}
              <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                "{item.excerpt}"
              </p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-surface text-text-muted px-1.5 py-0.2 rounded font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!isLoading && query && results.length === 0 && (
            <div className="py-12 text-center text-xs text-text-muted">
              No semantically matching notes or documents found.
            </div>
          )}

          {!query && (
            <div className="py-10 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-accent mx-auto" />
              <div className="text-xs font-medium text-white">Semantic Knowledge Search</div>
              <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                Search concepts and ideas even if the exact words do not appear in your notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
