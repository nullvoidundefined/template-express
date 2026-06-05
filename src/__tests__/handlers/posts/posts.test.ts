import { describe, it, expect, beforeEach } from 'vitest';
import { createPostsHandlers } from '../../../handlers/posts/posts.js';
import type { Post, PostsRepo } from '../../../repositories/posts/posts.js';
import { createMockReq, createMockRes } from '../../helpers.js';

let nextId = 1;

function createMockPostsRepo(): PostsRepo {
    const posts: Post[] = [];

    return {
        async createPost(userId: string, title: string, body: string) {
            const post: Post = { id: nextId++, user_id: userId, title, body, created_at: new Date() };
            posts.push(post);
            return post;
        },
        async deletePost(id: number, userId: string) {
            const index = posts.findIndex((p) => p.id === id && p.user_id === userId);
            if (index === -1) return false;
            posts.splice(index, 1);
            return true;
        },
        async findById(id: number) {
            return posts.find((p) => p.id === id);
        },
        async findByUserId(userId: string, limit: number, offset: number) {
            const filtered = posts.filter((p) => p.user_id === userId);
            return { posts: filtered.slice(offset, offset + limit), total: filtered.length };
        },
        async updatePost(id: number, userId: string, title: string, body: string) {
            const post = posts.find((p) => p.id === id && p.user_id === userId);
            if (!post) return undefined;
            post.title = title;
            post.body = body;
            return post;
        },
    };
}

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ID = '22222222-2222-2222-2222-222222222222';

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
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.create(req, res);

            expect(res._status).toBe(201);
            expect(res._json).toMatchObject({
                title: 'Hello',
                body: 'World',
                user_id: USER_ID,
            });
        });
    });

    describe('list', () => {
        it('returns empty array when user has no posts', async () => {
            const req = createMockReq({
                query: { limit: 20, offset: 0 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.list(req, res);

            const result = res._json as { posts: Post[]; total: number };
            expect(result.posts).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('returns only posts belonging to the user', async () => {
            await postsRepo.createPost(USER_ID, 'Mine', 'My post');
            await postsRepo.createPost(OTHER_ID, 'Theirs', 'Their post');

            const req = createMockReq({
                query: { limit: 20, offset: 0 },
                user: { email: 'user@test.com', id: USER_ID },
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
            const req = createMockReq({
                params: { id: 999 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when post belongs to another user', async () => {
            await postsRepo.createPost(OTHER_ID, 'Title', 'Body');

            const req = createMockReq({
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._status).toBe(404);
        });

        it('returns the post when it belongs to the user', async () => {
            await postsRepo.createPost(USER_ID, 'My Post', 'Content');

            const req = createMockReq({
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.show(req, res);

            expect(res._json).toMatchObject({ title: 'My Post', user_id: USER_ID });
        });
    });

    describe('remove', () => {
        it('returns 404 when post does not exist', async () => {
            const req = createMockReq({
                params: { id: 999 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when trying to delete another users post', async () => {
            await postsRepo.createPost(OTHER_ID, 'Title', 'Body');

            const req = createMockReq({
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._status).toBe(404);
        });

        it('deletes the post and returns success message', async () => {
            await postsRepo.createPost(USER_ID, 'Title', 'Body');

            const req = createMockReq({
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.remove(req, res);

            expect(res._json).toEqual({ message: 'Post deleted' });
        });
    });

    describe('update', () => {
        it('returns 404 when post does not exist', async () => {
            const req = createMockReq({
                body: { title: 'New', body: 'Content' },
                params: { id: 999 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._status).toBe(404);
        });

        it('returns 404 when post belongs to another user', async () => {
            await postsRepo.createPost(OTHER_ID, 'Title', 'Body');

            const req = createMockReq({
                body: { title: 'New', body: 'Content' },
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._status).toBe(404);
        });

        it('updates and returns the post on success', async () => {
            await postsRepo.createPost(USER_ID, 'Old Title', 'Old Body');

            const req = createMockReq({
                body: { title: 'New Title', body: 'New Body' },
                params: { id: 1 },
                user: { email: 'user@test.com', id: USER_ID },
            });
            const res = createMockRes();

            await handlers.update(req, res);

            expect(res._json).toMatchObject({ title: 'New Title', body: 'New Body' });
        });
    });
});
