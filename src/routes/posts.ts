import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { PostsHandlers } from '../handlers/posts.js';

function createPostsRouter(handlers: PostsHandlers, requireAuth: RequestHandler) {
    const router = Router();

    // All post routes require authentication
    router.use(requireAuth);

    router.get('/', handlers.list);
    router.get('/:id', handlers.show);
    router.post('/', handlers.create);
    router.put('/:id', handlers.update);
    router.delete('/:id', handlers.remove);

    return router;
}

export { createPostsRouter };
