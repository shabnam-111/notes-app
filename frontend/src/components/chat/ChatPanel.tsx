'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User as UserIcon,
  Send,
  Sparkles,
  ExternalLink,
  FileText,
  FileUp,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Database,
  Info,
} from 'lucide-react';
import { useChatStore, Message, Citation } from '@/stores/chatStore';
import { useNotesStore } from '@/stores/notesStore';
import { useRouter } from 'next/navigation';

export function ChatPanel() {
  const router = useRouter();
  const {
    sessions,
    activeSessionId,
    messages,
    isSending,
    fetchSessions,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  } = useChatStore();

  const { selectNote, notes } = useNotesStore();

  const [input, setInput] = useState('');
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  const toggleCitation = (msgId: string, idx: number) => {
    const key = `${msgId}-${idx}`;
    setExpandedCitations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSourceNote = (sourceId: string) => {
    const foundNote = notes.find((n) => n.id === sourceId);
    if (foundNote) {
      selectNote(foundNote);
      router.push('/notes');
    } else {
      router.push('/notes');
    }
  };

  return (
    <div className="flex-1 flex h-full bg-background overflow-hidden">
      {/* Conversation Sessions Sidebar */}
      <div className="w-64 border-r border-border bg-surface flex flex-col h-full flex-shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Conversations</span>
          <button
            onClick={() => createSession('New Knowledge Query')}
            className="flex items-center gap-1 text-xs text-accent-light hover:text-white bg-accent/15 border border-accent/30 px-2 py-1 rounded transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-accent-subtle text-white border border-accent/40 font-medium'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                }`}
              >
                <div className="truncate flex-1 mr-2">
                  <div className="truncate">{session.title}</div>
                  <div className="text-[10px] text-text-muted">{session.messageCount} messages</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 p-1 rounded transition"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <div className="text-center py-8 text-xs text-text-muted">No chat history yet.</div>
          )}
        </div>
      </div>

      {/* Main Chat Conversation View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 border-b border-border bg-surface px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-light">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-white block">MindVault Assistant</span>
              <span className="text-[10px] text-text-muted flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Grounded on your saved notes & documents</span>
              </span>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-glow-purple">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Ask your Personal Knowledge Base</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  MindVault retrieves the exact relevant excerpts from your notes and uploaded documents before answering, with verifiable source citations.
                </p>
              </div>

              {/* Sample Prompt Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
                {[
                  'Summarize everything I have written about Docker.',
                  'Explain Kubernetes networking using my saved notes.',
                  'What did I write about CI/CD and deployment pipelines?',
                  'Compare the information in my cloud computing notes.',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="p-3 bg-surface border border-border hover:border-accent text-xs text-text-secondary hover:text-white rounded-lg transition text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                  msg.role === 'user'
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border text-accent-light'
                }`}
              >
                {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`rounded-xl px-4 py-3 text-xs leading-relaxed space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-accent text-white max-w-lg'
                    : 'bg-surface border border-border text-text-primary max-w-2xl shadow-subtle'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Structured Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-light flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Retrieved Citations & Excerpts ({msg.citations.length})</span>
                    </div>

                    <div className="space-y-1">
                      {msg.citations.map((cite, idx) => {
                        const citeKey = `${msg.id}-${idx}`;
                        const isExpanded = expandedCitations[citeKey];
                        return (
                          <div
                            key={idx}
                            className="bg-background/80 border border-border/80 rounded-lg p-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                {cite.type === 'note' ? (
                                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                ) : (
                                  <FileUp className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                )}
                                <span className="font-semibold text-white truncate">{cite.title}</span>
                                {cite.pageNumber && (
                                  <span className="text-[10px] text-text-muted">Page {cite.pageNumber}</span>
                                )}
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900">
                                  {Math.round(cite.score * 100)}% match
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {cite.type === 'note' && (
                                  <button
                                    onClick={() => openSourceNote(cite.sourceId)}
                                    className="text-text-muted hover:text-white p-1 rounded"
                                    title="Open note in editor"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleCitation(msg.id, idx)}
                                  className="text-text-muted hover:text-white p-1 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Collapsible excerpt */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-border/40 text-text-secondary font-mono text-[11px] leading-relaxed bg-background/50 p-2 rounded">
                                "{cite.excerpt}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3 mr-auto max-w-xl">
              <div className="w-7 h-7 rounded-full bg-surface border border-border text-accent-light flex items-center justify-center text-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-surface border border-border rounded-xl px-4 py-3 text-xs text-text-secondary flex items-center gap-2 shadow-subtle">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span>Retrieving relevant notes & synthesizing response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-surface flex-shrink-0">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your knowledge base..."
              className="flex-1 bg-background border border-border focus:border-accent rounded-lg px-4 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
