import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

vi.mock('../src/config/prisma', () => {
  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@mindvault.ai',
    passwordHash: '$2a$10$hashedpassword',
    fullName: 'Test User',
    createdAt: new Date(),
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      folder: {
        create: vi.fn(),
      },
    },
  };
});

describe('Auth Controller & Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/auth/register - should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Password123!',
        fullName: 'Test User',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  it('POST /api/v1/auth/register - should reject passwords shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'valid@mindvault.ai',
        password: 'short',
        fullName: 'Test User',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login - should fail with 401 when user is not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@mindvault.ai',
        password: 'Password123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('POST /api/v1/auth/login - should authenticate and return JWT accessToken', async () => {
    const salt = await bcrypt.genSalt(10);
    const validHash = await bcrypt.hash('Password123!', salt);

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'user-uuid-1',
      email: 'demo@mindvault.ai',
      passwordHash: validHash,
      fullName: 'Gurnoor Singh',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'demo@mindvault.ai',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('demo@mindvault.ai');
  });
});
