import { Router } from 'express';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
} from '../controllers/documents.controller';
import { authenticateToken } from '../middleware/auth';
import { documentUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.post('/upload', documentUpload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.delete('/:id', deleteDocument);

export default router;
