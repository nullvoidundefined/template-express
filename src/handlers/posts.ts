import type { Request, Response } from 'express';
import { HTTP } from '../constants/http.js';
import { POST } from '../constants/posts.js';
import type { PostsRepo } from '../repositories/posts.js';

function createPostsHandlers(postsRepo: PostsRepo) {
    async function create(req: Request, res: Response) {
        const { title, body } = req.body;

        // Validate required fields
        if (!title || !body) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({
                error: POST.ERRORS.TITLE_AND_BODY_REQUIRED,
            });
            return;
        }

        // Validate input lengths
        if (title.length > POST.LIMITS.TITLE_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: POST.ERRORS.TITLE_TOO_LONG });
            return;
        }
        if (body.length > POST.LIMITS.BODY_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: POST.ERRORS.BODY_TOO_LONG });
            return;
        }

        const post = await postsRepo.createPost(req.email!, title, body);
        res.status(HTTP.STATUS.CREATED).json(post);
    }

    async function list(req: Request, res: Response) {
        const posts = await postsRepo.findByEmail(req.email!);
        res.json(posts);
    }

    async function remove(req: Request, res: Response) {
        const id = Number(req.params.id);

        // Only delete if the post belongs to the authenticated user
        const deleted = await postsRepo.deletePost(id, req.email!);
        if (!deleted) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json({ message: 'Post deleted' });
    }

    async function update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const { title, body } = req.body;

        // Validate required fields
        if (!title || !body) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({
                error: POST.ERRORS.TITLE_AND_BODY_REQUIRED,
            });
            return;
        }

        // Validate input lengths
        if (title.length > POST.LIMITS.TITLE_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: POST.ERRORS.TITLE_TOO_LONG });
            return;
        }
        if (body.length > POST.LIMITS.BODY_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: POST.ERRORS.BODY_TOO_LONG });
            return;
        }

        // Only update if the post belongs to the authenticated user
        const post = await postsRepo.updatePost(id, req.email!, title, body);
        if (!post) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json(post);
    }

    async function show(req: Request, res: Response) {
        const id = Number(req.params.id);
        const post = await postsRepo.findById(id);

        // Only show posts belonging to the authenticated user
        if (!post || post.email !== req.email) {
            res.status(HTTP.STATUS.NOT_FOUND).json({ error: POST.ERRORS.NOT_FOUND });
            return;
        }

        res.json(post);
    }

    return { create, list, remove, show, update };
}

export { createPostsHandlers };
export type PostsHandlers = ReturnType<typeof createPostsHandlers>;
