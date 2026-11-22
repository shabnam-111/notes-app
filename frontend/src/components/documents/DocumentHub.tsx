'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  FileText,
  FileCheck2,
  AlertCircle,
  Loader2,
  Trash2,
  Clock,
  Layers,
  HardDrive,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useDocsStore, DocumentItem } from '@/stores/docsStore';
import { formatBytes, formatDate } from '@/lib/utils';

export function DocumentHub() {
  const {
    documents,
    isLoading,
    isUploading,
    uploadError,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  } = useDocsStore();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      alert(`Unsupported file format. Please upload PDF, DOCX, TXT, or MD.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert(`File size exceeds 25MB limit.`);
      return;
    }

    await uploadDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Document Intelligence Hub</h2>
          <p className="text-xs text-text-secondary mt-1">
            Upload PDF, DOCX, TXT, or Markdown files. Text is extracted, chunked, and indexed for semantic search and RAG chat.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/60 bg-surface/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent-light">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          ) : (
            <FileUp className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold text-white">
            {isUploading ? 'Uploading & parsing document...' : 'Click or drag documents to upload'}
          </div>
          <div className="text-xs text-text-muted">
            Supports PDF (with multi-page OCR), DOCX, Markdown, and TXT (Max 25MB)
          </div>
        </div>

        {uploadError && (
          <div className="text-xs text-red-400 bg-red-950/60 border border-red-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Document Library Listing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Indexed Documents ({documents.length})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isIndexed = doc.status === 'indexed';
            const isProcessing = doc.status === 'processing' || doc.status === 'uploaded';
            const isFailed = doc.status === 'failed';

            return (
              <div
                key={doc.id}
                className="bg-surface border border-border hover:border-accent/50 rounded-xl p-4 flex flex-col justify-between transition shadow-subtle space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Title and Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-accent-light flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-white block truncate" title={doc.title}>
                          {doc.title}
                        </span>
                        <span className="text-[10px] text-text-muted uppercase font-mono">
                          {doc.fileType}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isIndexed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Indexed</span>
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-800 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 text-[11px] text-text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{formatBytes(doc.fileSize)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-accent-light" />
                      <span>{doc.chunksCount} chunks</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(doc.createdAt)}</span>
                    </span>
                  </div>

                  {doc.errorMessage && (
                    <div className="text-[11px] text-red-300 bg-red-950/50 p-2 rounded border border-red-900 leading-tight">
                      {doc.errorMessage}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-mono truncate max-w-[150px]">
                    {doc.filename}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete document "${doc.title}" and its vector index?`)) {
                        deleteDocument(doc.id);
                      }
                    }}
                    className="text-text-muted hover:text-red-400 p-1.5 rounded transition"
                    title="Delete document & vectors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && !isLoading && (
            <div className="col-span-full py-12 text-center text-xs text-text-muted">
              No documents uploaded yet. Drag and drop a PDF, DOCX, TXT, or MD above to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
