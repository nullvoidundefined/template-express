import { Router } from 'express';
import { create, list, remove, show } from '../handlers/posts.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// All post routes require authentication
router.use(requireAuth);

router.get('/', list);
router.get('/:id', show);
router.post('/', create);
router.delete('/:id', remove);

export default router;
