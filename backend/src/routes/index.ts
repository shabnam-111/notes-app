import { Router } from 'express';
import authRoutes from './auth.routes';
import notesRoutes from './notes.routes';
import foldersRoutes from './folders.routes';
import tagsRoutes from './tags.routes';
import documentsRoutes from './documents.routes';
import searchRoutes from './search.routes';
import chatRoutes from './chat.routes';
import aiRoutes from './ai.routes';

const router = Router();

// Root API v1 info endpoint
router.get('/', (_req, res) => {
  res.json({
    success: true,
    name: 'MindVault API',
    version: '1.0.0',
    description: 'AI-Powered Personal Knowledge Management System API',
    webApp: 'http://localhost:3000',
    health: '/api/v1/health',
    aiServiceDocs: 'http://localhost:8000/docs',
    endpoints: {
      auth: '/api/v1/auth',
      notes: '/api/v1/notes',
      folders: '/api/v1/folders',
      tags: '/api/v1/tags',
      documents: '/api/v1/documents',
      search: '/api/v1/search',
      chat: '/api/v1/chat',
      ai: '/api/v1/ai',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/notes', notesRoutes);
router.use('/folders', foldersRoutes);
router.use('/tags', tagsRoutes);
router.use('/documents', documentsRoutes);
router.use('/search', searchRoutes);
router.use('/chat', chatRoutes);
router.use('/ai', aiRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mindvault-backend',
    timestamp: new Date().toISOString(),
  });
});

export default router;
