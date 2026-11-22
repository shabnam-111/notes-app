'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SemanticSearchModal } from '@/components/search/SemanticSearchModal';
import { useAuthStore } from '@/stores/authStore';
import { useNotesStore } from '@/stores/notesStore';
import { usePathname, useRouter } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, initAuth, isLoading: authLoading } = useAuthStore();
  const { fetchNotes, fetchFolders, fetchTags } = useNotesStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && !token && !isAuthPage) {
      router.push('/login');
    } else if (token && !isAuthPage) {
      fetchNotes();
      fetchFolders();
      fetchTags();
    }
  }, [token, authLoading, isAuthPage]);

  // Global Ctrl+K shortcut listener for Semantic Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthPage) {
    return (
      <html lang="en" className="dark">
        <head>
          <title>MindVault - Sign In</title>
        </head>
        <body className="bg-background text-text-primary min-h-screen flex items-center justify-center p-4">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <head>
        <title>MindVault - AI Personal Knowledge Management System</title>
      </head>
      <body className="bg-background text-text-primary min-h-screen flex h-screen overflow-hidden antialiased">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content View */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
        </div>

        {/* Global Semantic Search Modal */}
        <SemanticSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </body>
    </html>
  );
}
