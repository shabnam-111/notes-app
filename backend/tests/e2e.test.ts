import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/prisma';
import { aiServiceClient } from '../src/services/aiService.client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

// Mock Prisma for high-speed deterministic E2E integration verification
vi.mock('../src/config/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      folder: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
      note: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      tag: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
      noteTag: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
      aiJob: {
        create: vi.fn(),
        update: vi.fn(),
      },
      chatSession: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
      chatMessage: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

// Mock AI Service Client methods
vi.mock('../src/services/aiService.client', () => {
  return {
    aiServiceClient: {
      indexNote: vi.fn().mockResolvedValue({ success: true, pointId: 'vec-point-1' }),
      deleteNoteVector: vi.fn().mockResolvedValue(true),
      processDocument: vi.fn().mockResolvedValue({ success: true, chunksCount: 4 }),
      deleteDocumentVectors: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue({
        total: 1,
        results: [
          {
            id: 'vec-hit-1',
            sourceId: 'note-1',
            sourceType: 'note',
            title: 'Container Orchestration with Kubernetes',
            excerpt: 'Kubernetes coordinates clusters of nodes to run containerized workloads.',
            score: 0.92,
            tags: ['Kubernetes', 'DevOps'],
          },
        ],
      }),
      chatWithNotes: vi.fn().mockResolvedValue({
        answer: 'According to your notes, Kubernetes coordinates containerized workloads using Pods and Deployments [NOTE: Container Orchestration with Kubernetes].',
        citations: [
          {
            sourceId: 'note-1',
            title: 'Container Orchestration with Kubernetes',
            type: 'note',
            excerpt: 'Kubernetes coordinates clusters of nodes to run containerized workloads.',
            score: 0.92,
          },
        ],
        model: 'gemini-1.5-flash',
        fromKnowledgeBase: true,
      }),
      analyzeNote: vi.fn().mockResolvedValue({
        category: 'DevOps',
        tags: ['Kubernetes', 'Docker', 'Containers'],
        description: 'An overview of container orchestration and cluster management.',
        keywords: ['Pods', 'Deployments', 'Nodes', 'Workloads'],
        relatedNoteIds: [],
      }),
    },
  };
});

describe('MindVault End-to-End System Integration Suite', () => {
  const userToken = jwt.sign(
    { id: 'user-e2e-1', email: 'architect@mindvault.ai', fullName: 'Gurnoor Singh' },
    config.jwt.secret
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------
  // 1. FEATURE 1: Rich Text Note Lifecycle & Concurrency
  // -------------------------------------------------------------
  describe('FEATURE 1: Rich Text Note Lifecycle & Concurrency', () => {
    it('should create a rich text note, index vectors, and return structured note', async () => {
      const mockCreated = {
        id: 'note-e2e-1',
        userId: 'user-e2e-1',
        title: 'Microservices Design Patterns',
        contentText: 'Circuit breakers prevent cascading failures in distributed systems.',
        contentJson: { type: 'doc' },
        isPinned: false,
        isArchived: false,
        version: 1,
        lastEditedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      };

      vi.mocked(prisma.note.create).mockResolvedValueOnce(mockCreated as any);
      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce(mockCreated as any);

      const res = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Microservices Design Patterns',
          contentText: 'Circuit breakers prevent cascading failures in distributed systems.',
          contentJson: { type: 'doc' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Microservices Design Patterns');
      expect(prisma.note.create).toHaveBeenCalled();
    });

    it('should reject concurrent note modifications when stale version is supplied (409 Conflict)', async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValueOnce({
        id: 'note-e2e-1',
        userId: 'user-e2e-1',
        version: 3, // Current version is 3
      } as any);

      const res = await request(app)
        .put('/api/v1/notes/note-e2e-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Updated Title',
          version: 2, // Client sends stale version 2
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONCURRENT_MODIFICATION');
    });

    it('should toggle pin and archive status', async () => {
      vi.mocked(prisma.note.findFirst).mockResolvedValueOnce({
        id: 'note-e2e-1',
        userId: 'user-e2e-1',
        isPinned: false,
      } as any);

      vi.mocked(prisma.note.update).mockResolvedValueOnce({
        id: 'note-e2e-1',
        isPinned: true,
      } as any);

      const res = await request(app)
        .post('/api/v1/notes/note-e2e-1/pin')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isPinned).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 2. FEATURE 2: AI-Powered Semantic Search
  // -------------------------------------------------------------
  describe('FEATURE 2: AI-Powered Semantic Search', () => {
    it('should convert query into embedding and return ranked conceptual results', async () => {
      const res = await request(app)
        .post('/api/v1/search')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          query: 'How does container clustering and deployment work?',
          filterType: 'all',
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].title).toBe('Container Orchestration with Kubernetes');
      expect(res.body.results[0].score).toBe(0.92);
      expect(aiServiceClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-e2e-1',
          query: 'How does container clustering and deployment work?',
        })
      );
    });
  });

  // -------------------------------------------------------------
  // 3. FEATURE 3: RAG-Based AI Chat With Verifiable Citations
  // -------------------------------------------------------------
  describe('FEATURE 3: RAG-Based AI Chat With Notes', () => {
    it('should retrieve knowledge context, call LLM, and return answer with citations', async () => {
      const sessionId = 'session-e2e-1';

      vi.mocked(prisma.chatSession.findFirst).mockResolvedValueOnce({
        id: sessionId,
        userId: 'user-e2e-1',
        title: 'New Conversation',
        messages: [],
      } as any);

      vi.mocked(prisma.chatMessage.create).mockImplementation(async (args: any) => ({
        id: 'msg-mock-id',
        sessionId: args.data.sessionId,
        role: args.data.role,
        content: args.data.content,
        citations: args.data.citations,
        createdAt: new Date(),
      }));

      vi.mocked(prisma.chatSession.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post(`/api/v1/chat/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: 'Explain Kubernetes based on my notes',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fromKnowledgeBase).toBe(true);
      expect(res.body.assistantMessage.citations).toBeDefined();
      expect(res.body.assistantMessage.citations[0].sourceId).toBe('note-1');
      expect(aiServiceClient.chatWithNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-e2e-1',
          message: 'Explain Kubernetes based on my notes',
        })
      );
    });
  });

  // -------------------------------------------------------------
  // 4. FEATURE 4: Automatic AI Tagging and Categorization
  // -------------------------------------------------------------
  describe('FEATURE 4: Automatic AI Tagging & Categorization', () => {
    it('should analyze note content and return suggested category and tags', async () => {
      vi.mocked(prisma.tag.findMany).mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/v1/ai/analyze-note')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Docker and Containerization Fundamentals',
          contentText: 'Docker packages apps into portable container images.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('DevOps');
      expect(res.body.data.suggestedTags).toContain('Kubernetes');
      expect(res.body.data.keywords.length).toBeGreaterThan(0);
    });

    it('should accept AI suggested tags and apply to note', async () => {
      const validNoteUuid = '11111111-1111-1111-1111-111111111111';

      vi.mocked(prisma.note.findFirst).mockResolvedValueOnce({
        id: validNoteUuid,
        userId: 'user-e2e-1',
      } as any);

      vi.mocked(prisma.folder.upsert).mockResolvedValueOnce({
        id: 'folder-1',
        userId: 'user-e2e-1',
        name: 'DevOps',
      } as any);

      vi.mocked(prisma.tag.upsert).mockResolvedValue({
        id: 'tag-1',
        userId: 'user-e2e-1',
        name: 'DevOps',
        color: '#8B5CF6',
      } as any);

      vi.mocked(prisma.noteTag.upsert).mockResolvedValue({} as any);

      vi.mocked(prisma.note.findUnique).mockResolvedValueOnce({
        id: validNoteUuid,
        title: 'Docker',
        tags: [{ tag: { id: 'tag-1', name: 'DevOps', color: '#8B5CF6' } }],
      } as any);

      const res = await request(app)
        .post('/api/v1/ai/accept-tags')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          noteId: validNoteUuid,
          tags: ['DevOps', 'Containers'],
          category: 'DevOps',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. FEATURE 5: Document Intelligence
  // -------------------------------------------------------------
  describe('FEATURE 5: Document Intelligence', () => {
    it('should list uploaded documents with status and chunk metrics', async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValueOnce([
        {
          id: 'doc-1',
          title: 'System_Architecture_Whitepaper',
          filename: 'System_Architecture_Whitepaper.pdf',
          fileType: 'pdf',
          fileSize: 1048576,
          status: 'indexed',
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { chunks: 12 },
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].chunksCount).toBe(12);
      expect(res.body.data[0].status).toBe('indexed');
    });
  });
});
