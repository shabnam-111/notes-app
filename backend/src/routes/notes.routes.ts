import { Router } from 'express';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
} from '../controllers/notes.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listNotes);
router.post('/', createNote);
router.get('/:id', getNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.post('/:id/pin', togglePin);
router.post('/:id/archive', toggleArchive);

export default router;
