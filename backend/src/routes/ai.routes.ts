import { Router } from 'express';
import { analyzeNote, acceptTags } from '../controllers/ai.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/analyze-note', analyzeNote);
router.post('/accept-tags', acceptTags);

export default router;
