'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Bot,
  Search,
  FileUp,
  Settings,
  Plus,
  FolderPlus,
  Tag as TagIcon,
  Pin,
  Archive,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const {
    folders,
    tags,
    createNote,
    createFolder,
    selectedFolderId,
    setSelectedFolder,
    selectedTagId,
    setSelectedTag,
  } = useNotesStore();

  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'All Notes', href: '/notes', icon: FileText },
    { label: 'AI Assistant', href: '/chat', icon: Bot, badge: 'RAG' },
    { label: 'Semantic Search', href: '/search', icon: Search },
    { label: 'Documents', href: '/documents', icon: FileUp },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen flex flex-col select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-glow-purple">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">MindVault</span>
            <span className="text-[10px] text-accent-light font-medium tracking-wide uppercase">AI Knowledge Vault</span>
          </div>
        </Link>
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <button
          onClick={() => createNote()}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-2 px-3 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent-subtle text-accent-light'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent-light' : 'text-text-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold bg-purple-950 text-accent-light border border-purple-800 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Folders Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            <button
              onClick={() => setFoldersOpen(!foldersOpen)}
              className="flex items-center gap-1 hover:text-text-secondary"
            >
              {foldersOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Folders</span>
            </button>
            <button
              onClick={() => setIsAddingFolder(!isAddingFolder)}
              className="hover:text-white"
              title="Add Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isAddingFolder && (
            <form onSubmit={handleCreateFolder} className="px-3 py-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-white placeholder-text-muted outline-none focus:border-accent"
              />
            </form>
          )}

          {foldersOpen && (
            <div className="space-y-0.5 mt-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  selectedFolderId === null
                    ? 'text-white bg-surface-muted'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-text-muted" />
                  <span>All Folders</span>
                </div>
              </button>

              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    selectedFolderId === folder.id
                      ? 'text-accent-light bg-accent-subtle font-semibold'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: folder.color || '#8B5CF6' }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {folder.notesCount !== undefined && folder.notesCount > 0 && (
                    <span className="text-[10px] text-text-muted font-mono">{folder.notesCount}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              className="flex items-center gap-1 hover:text-text-secondary"
            >
              {tagsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Tags</span>
            </button>
          </div>

          {tagsOpen && (
            <div className="flex flex-wrap gap-1 px-3 mt-1.5">
              {tags.map((tag) => {
                const isSelected = selectedTagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      isSelected
                        ? 'bg-accent text-white'
                        : 'bg-background text-text-secondary border border-border hover:border-accent hover:text-white'
                    }`}
                  >
                    <span>#</span>
                    <span>{tag.name}</span>
                  </button>
                );
              })}
              {tags.length === 0 && (
                <span className="text-xs text-text-muted italic">No tags yet</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-border flex items-center justify-between bg-surface-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="truncate">
            <div className="text-xs font-medium text-white truncate">{user?.fullName || 'User'}</div>
            <div className="text-[10px] text-text-muted truncate">{user?.email || 'user@mindvault.ai'}</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="text-text-muted hover:text-red-400 p-1.5 rounded transition"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
