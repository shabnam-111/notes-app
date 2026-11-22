import { Router } from 'express';
import { listTags, createTag, deleteTag } from '../controllers/tags.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listTags);
router.post('/', createTag);
router.delete('/:id', deleteTag);

export default router;
