import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { PostsHandlers } from '../handlers/posts.js';
import { validate } from '../middleware/validate.js';
import {
    createPostSchema,
    paginationSchema,
    postIdSchema,
    updatePostSchema,
} from '../schemas/posts.js';

function createPostsRouter(handlers: PostsHandlers, requireAuth: RequestHandler) {
    const router = Router();

    // All post routes require authentication
    router.use(requireAuth);

    router.get('/', validate(paginationSchema, 'query'), handlers.list);
    router.get('/:id', validate(postIdSchema, 'params'), handlers.show);
    router.post('/', validate(createPostSchema), handlers.create);
    router.put(
        '/:id',
        validate(postIdSchema, 'params'),
        validate(updatePostSchema),
        handlers.update,
    );
    router.delete('/:id', validate(postIdSchema, 'params'), handlers.remove);

    return router;
}

export { createPostsRouter };
