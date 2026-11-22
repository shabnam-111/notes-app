import { Router } from 'express';
import {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  sendMessage,
} from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/sessions', listSessions);
router.post('/sessions', createSession);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/messages', sendMessage);

export default router;
