import { describe, it, expect, beforeEach } from 'vitest';
import { createPostsHandlers } from '../../handlers/posts.js';
import type { Post, PostsRepo } from '../../repositories/posts.js';
import { createMockReq, createMockRes } from '../helpers.js';

let nextId = 1;

function createMockPostsRepo(): PostsRepo {
    const posts: Post[] = [];

    return {
        async createPost(email: string, title: string, body: string) {
            const post: Post = { id: nextId++, email, title, body, created_at: new Date() };
            posts.push(post);
            return post;
        },
        async deletePost(id: number, email: string) {
            const index = posts.findIndex((p) => p.id === id && p.email === email);
            if (index === -1) return false;
            posts.splice(index, 1);
            return true;
        },
        async findByEmail(email: string, limit: number, offset: number) {
            const filtered = posts.filter((p) => p.email === email);
            return { posts: filtered.slice(offset, offset + limit), total: filtered.length };
        },
        async findById(id: number) {
            return posts.find((p) => p.id === id);
        },
        async updatePost(id: number, email: string, title: string, body: string) {
            const post = posts.find((p) => p.id === id && p.email === email);
            if (!post) return undefined;
            post.title = title;
            post.body = body;
            return post;
        },
    };
}

describe('posts handlers', () => {
    let postsRepo: PostsRepo;
    let handlers: ReturnType<typeof createPostsHandlers>;

    beforeEach(() => {
        nextId = 1;
        postsRepo = createMockPostsRepo();
        handlers = createPostsHandlers(postsRepo);
    });

    describe('create', () => {
        it('returns 201 with post on success', async () => {
            const req = createMockReq({
                body: { title: 'Hello', body: 'World' },
                email: 'user@test.com',
            });
            const res = createMockRes();

            await handlers.create(req, res);

            expect(res._status).toBe(201);
            expect(res._json).toMatchObject({
                title: 'Hello',
                body: 'World',
                email: 'user@test.com',
            });
        });
    });

    describe('list', () => {
        it('returns empty array when user has no posts', async () => {
            const req = createMockReq({
                email: 'user@test.com',
                query: { limit: 20, offset: 0 },
            });
            const res = createMockRes();

            await handlers.list(req, res);

            const result = res._json as { posts: Post[]; total: number };
            expect(result.posts).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns only posts belonging to the user', async () => {
            await postsRepo.createPost('user@test.com', 'Mine', 'My post');
            await postsRepo.createPost('other@test.com', 'Theirs', 'Their post');

            const req = createMockReq({
                email: 'user@test.com',
                query: { limit: 20, offset: 0 },
            });
            const res = createMockRes();

            await handlers.list(req, res);

            const result = res._json as { posts: Post[]; total: number };
            expect(result.posts).toHaveLength(1);
            expect(result.posts[0].title).toBe('Mine');
            expect(result.total).toBe(1);
        });
    });

    describe('show', () => {
        it('returns 404 when post does not exist', async () => {
            const req = createMockReq({ params: { id: 999 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when post belongs to another user', async () => {
            await postsRepo.createPost('other@test.com', 'Title', 'Body');

            const req = createMockReq({ params: { id: 1 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._status).toBe(404);
        });

        it('returns the post when it belongs to the user', async () => {
            await postsRepo.createPost('user@test.com', 'My Post', 'Content');

            const req = createMockReq({ params: { id: 1 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._json).toMatchObject({ title: 'My Post', email: 'user@test.com' });
        });
    });

    describe('remove', () => {
        it('returns 404 when post does not exist', async () => {
            const req = createMockReq({ params: { id: 999 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when trying to delete another users post', async () => {
            await postsRepo.createPost('other@test.com', 'Title', 'Body');

            const req = createMockReq({ params: { id: 1 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._status).toBe(404);
        });

        it('deletes the post and returns success message', async () => {
            await postsRepo.createPost('user@test.com', 'Title', 'Body');

            const req = createMockReq({ params: { id: 1 }, email: 'user@test.com' });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._json).toEqual({ message: 'Post deleted' });
        });
    });

    describe('update', () => {
        it('returns 404 when post does not exist', async () => {
            const req = createMockReq({
                params: { id: 999 },
                body: { title: 'New', body: 'Content' },
                email: 'user@test.com',
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when post belongs to another user', async () => {
            await postsRepo.createPost('other@test.com', 'Title', 'Body');

            const req = createMockReq({
                params: { id: 1 },
                body: { title: 'New', body: 'Content' },
                email: 'user@test.com',
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._status).toBe(404);
        });

        it('updates and returns the post on success', async () => {
            await postsRepo.createPost('user@test.com', 'Old Title', 'Old Body');

            const req = createMockReq({
                params: { id: 1 },
                body: { title: 'New Title', body: 'New Body' },
                email: 'user@test.com',
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._json).toMatchObject({ title: 'New Title', body: 'New Body' });
        });
    });
});
