import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

vi.mock('../src/config/prisma', () => {
  return {
    prisma: {
      note: {
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe('Cross-User Data Isolation Tests', () => {
  const userAToken = jwt.sign(
    { id: 'user-A', email: 'userA@mindvault.ai', fullName: 'User A' },
    config.jwt.secret
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/notes/:id - User A cannot access User B note (returns 404)', async () => {
    // When User A queries with note ID belonging to User B, prisma query with { id, userId: 'user-A' } yields null
    vi.mocked(prisma.note.findFirst).mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/notes/note-belonging-to-user-b')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Note not found');
    expect(prisma.note.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-A',
        }),
      })
    );
  });

  it('PUT /api/v1/notes/:id - enforces optimistic concurrency control', async () => {
    // Existing note has version 5
    vi.mocked(prisma.note.findFirst).mockResolvedValueOnce({
      id: 'note-1',
      userId: 'user-A',
      title: 'Note Title',
      version: 5,
    } as any);

    // User attempts to save with stale version 4
    const res = await request(app)
      .put('/api/v1/notes/note-1')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'New Title',
        version: 4, // Stale version
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONCURRENT_MODIFICATION');
  });
});
