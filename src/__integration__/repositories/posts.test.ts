import { describe, it, expect } from 'vitest';
import { createPostsRepo } from '../../repositories/posts.js';
import { createUsersRepo } from '../../repositories/users.js';
import { testPool } from '../setup.js';

describe('posts repository', () => {
    const postsRepo = createPostsRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    async function seedUser(email = 'user@test.com') {
        await usersRepo.insertUser(email, 'hash');
    }

    describe('createPost', () => {
        it('creates a post and returns it with an id', async () => {
            await seedUser();

            const post = await postsRepo.createPost('user@test.com', 'Title', 'Body');

            expect(post).toMatchObject({
                email: 'user@test.com',
                title: 'Title',
                body: 'Body',
            });
            expect(post.id).toBeGreaterThan(0);
            expect(post.created_at).toBeInstanceOf(Date);
        });
    });

    describe('findByEmail', () => {
        it('returns empty array when user has no posts', async () => {
            await seedUser();

            const { posts, total } = await postsRepo.findByEmail('user@test.com', 20, 0);

            expect(posts).toEqual([]);
            expect(total).toBe(0);
        });

        it('returns posts in reverse chronological order', async () => {
            await seedUser();
            await postsRepo.createPost('user@test.com', 'First', 'Body');
            await postsRepo.createPost('user@test.com', 'Second', 'Body');

            const { posts } = await postsRepo.findByEmail('user@test.com', 20, 0);

            expect(posts[0].title).toBe('Second');
            expect(posts[1].title).toBe('First');
        });

        it('does not return posts from other users', async () => {
            await seedUser('a@test.com');
            await seedUser('b@test.com');
            await postsRepo.createPost('a@test.com', 'A post', 'Body');
            await postsRepo.createPost('b@test.com', 'B post', 'Body');

            const { posts } = await postsRepo.findByEmail('a@test.com', 20, 0);

            expect(posts).toHaveLength(1);
            expect(posts[0].title).toBe('A post');
        });

        it('respects limit and offset', async () => {
            await seedUser();
            await postsRepo.createPost('user@test.com', 'First', 'Body');
            await postsRepo.createPost('user@test.com', 'Second', 'Body');
            await postsRepo.createPost('user@test.com', 'Third', 'Body');

            const { posts, total } = await postsRepo.findByEmail('user@test.com', 1, 1);

            expect(posts).toHaveLength(1);
            expect(total).toBe(3);
        });
    });

    describe('findById', () => {
        it('returns undefined when post does not exist', async () => {
            const post = await postsRepo.findById(999);

            expect(post).toBeUndefined();
        });

        it('returns the post when found', async () => {
            await seedUser();
            const created = await postsRepo.createPost('user@test.com', 'Find me', 'Body');

            const post = await postsRepo.findById(created.id);

            expect(post).toMatchObject({ title: 'Find me' });
        });
    });

    describe('updatePost', () => {
        it('returns undefined when post does not exist', async () => {
            const result = await postsRepo.updatePost(999, 'user@test.com', 'Title', 'Body');

            expect(result).toBeUndefined();
        });

        it('returns undefined when email does not match', async () => {
            await seedUser('owner@test.com');
            const post = await postsRepo.createPost('owner@test.com', 'Title', 'Body');

            const result = await postsRepo.updatePost(post.id, 'other@test.com', 'New', 'New');

            expect(result).toBeUndefined();
        });

        it('updates and returns the post', async () => {
            await seedUser();
            const post = await postsRepo.createPost('user@test.com', 'Old', 'Old body');

            const updated = await postsRepo.updatePost(post.id, 'user@test.com', 'New', 'New body');

            expect(updated).toMatchObject({ id: post.id, title: 'New', body: 'New body' });
        });
    });

    describe('deletePost', () => {
        it('returns false when post does not exist', async () => {
            const result = await postsRepo.deletePost(999, 'user@test.com');

            expect(result).toBe(false);
        });

        it('returns false when email does not match', async () => {
            await seedUser('owner@test.com');
            const post = await postsRepo.createPost('owner@test.com', 'Title', 'Body');

            const result = await postsRepo.deletePost(post.id, 'other@test.com');

            expect(result).toBe(false);
        });

        it('deletes the post and returns true', async () => {
            await seedUser();
            const post = await postsRepo.createPost('user@test.com', 'Title', 'Body');

            const result = await postsRepo.deletePost(post.id, 'user@test.com');

            expect(result).toBe(true);
            expect(await postsRepo.findById(post.id)).toBeUndefined();
        });
    });

    describe('cascade on user delete', () => {
        it('removes posts when the user is deleted', async () => {
            await seedUser('cascade@test.com');
            const post = await postsRepo.createPost('cascade@test.com', 'Title', 'Body');

            await testPool.query('DELETE FROM users WHERE email = $1', ['cascade@test.com']);

            expect(await postsRepo.findById(post.id)).toBeUndefined();
        });
    });
});
