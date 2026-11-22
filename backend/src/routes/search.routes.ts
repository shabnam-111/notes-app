import { Router } from 'express';
import { searchKnowledge } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', searchKnowledge);

export default router;
