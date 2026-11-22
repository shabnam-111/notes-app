import { Router } from 'express';
import {
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from '../controllers/folders.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listFolders);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export default router;
