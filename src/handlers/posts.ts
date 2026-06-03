import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { POST } from '../constants/posts.js';
import type { PostsRepo } from '../repositories/posts.js';

function createPostsHandlers(postsRepo: PostsRepo) {
    async function create(req: Request, res: Response) {
        const { title, body } = req.body;

        const post = await postsRepo.createPost(req.email!, title, body);
        res.status(HTTP.STATUS.CREATED).json(post);
    }

    async function list(req: Request, res: Response) {
        const { limit, offset } = req.query as unknown as { limit: number; offset: number };

        const { posts, total } = await postsRepo.findByEmail(req.email!, limit, offset);
        res.json({ posts, total, limit, offset });
    }

    async function remove(req: Request, res: Response) {
        const { id } = req.params as unknown as { id: number };

        // Only delete if the post belongs to the authenticated user
        const deleted = await postsRepo.deletePost(id, req.email!);
        if (!deleted) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json({ message: 'Post deleted' });
    }

    async function show(req: Request, res: Response) {
        const { id } = req.params as unknown as { id: number };
        const post = await postsRepo.findById(id);

        // Only show posts belonging to the authenticated user
        if (!post || post.email !== req.email) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json(post);
    }

    async function update(req: Request, res: Response) {
        const { id } = req.params as unknown as { id: number };
        const { title, body } = req.body;

        // Only update if the post belongs to the authenticated user
        const post = await postsRepo.updatePost(id, req.email!, title, body);
        if (!post) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json(post);
    }

    return { create, list, remove, show, update };
}

export { createPostsHandlers };
export type PostsHandlers = ReturnType<typeof createPostsHandlers>;
