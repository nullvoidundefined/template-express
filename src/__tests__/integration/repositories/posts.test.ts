import { describe, it, expect } from 'vitest';
import { createPostsRepo } from '../../../repositories/posts/posts.js';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('posts repository', () => {
    const postsRepo = createPostsRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    async function seedUser(email = 'user@test.com'): Promise<string> {
        const id = await usersRepo.insertUser(email, 'hash');
        if (!id) throw new Error('seed user failed');
        return id;
    }

    describe('createPost', () => {
        it('creates a post and returns it with an id', async () => {
            const userId = await seedUser();

            const post = await postsRepo.createPost(userId, 'Title', 'Body');

            expect(post).toMatchObject({
                user_id: userId,
                title: 'Title',
                body: 'Body',
            });
            expect(post.id).toBeGreaterThan(0);
            expect(post.created_at).toBeInstanceOf(Date);
        });
    });

    describe('findByUserId', () => {
        it('returns empty array when user has no posts', async () => {
            const userId = await seedUser();

            const { posts, total } = await postsRepo.findByUserId(userId, 20, 0);

            expect(posts).toEqual([]);
            expect(total).toBe(0);
        });

        it('returns posts in reverse chronological order', async () => {
            const userId = await seedUser();
            await postsRepo.createPost(userId, 'First', 'Body');
            await postsRepo.createPost(userId, 'Second', 'Body');

            const { posts } = await postsRepo.findByUserId(userId, 20, 0);

            expect(posts[0].title).toBe('Second');
            expect(posts[1].title).toBe('First');
        });

        it('does not return posts from other users', async () => {
            const userA = await seedUser('a@test.com');
            const userB = await seedUser('b@test.com');
            await postsRepo.createPost(userA, 'A post', 'Body');
            await postsRepo.createPost(userB, 'B post', 'Body');

            const { posts } = await postsRepo.findByUserId(userA, 20, 0);

            expect(posts).toHaveLength(1);
            expect(posts[0].title).toBe('A post');
        });

        it('respects limit and offset', async () => {
            const userId = await seedUser();
            await postsRepo.createPost(userId, 'First', 'Body');
            await postsRepo.createPost(userId, 'Second', 'Body');
            await postsRepo.createPost(userId, 'Third', 'Body');

            const { posts, total } = await postsRepo.findByUserId(userId, 1, 1);

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
            const userId = await seedUser();
            const created = await postsRepo.createPost(userId, 'Find me', 'Body');

            const post = await postsRepo.findById(created.id);

            expect(post).toMatchObject({ title: 'Find me' });
        });
    });

    describe('updatePost', () => {
        it('returns undefined when post does not exist', async () => {
            const userId = await seedUser();
            const result = await postsRepo.updatePost(999, userId, 'Title', 'Body');

            expect(result).toBeUndefined();
        });

        it('returns undefined when user_id does not match', async () => {
            const owner = await seedUser('owner@test.com');
            const other = await seedUser('other@test.com');
            const post = await postsRepo.createPost(owner, 'Title', 'Body');

            const result = await postsRepo.updatePost(post.id, other, 'New', 'New');

            expect(result).toBeUndefined();
        });

        it('updates and returns the post', async () => {
            const userId = await seedUser();
            const post = await postsRepo.createPost(userId, 'Old', 'Old body');

            const updated = await postsRepo.updatePost(post.id, userId, 'New', 'New body');

            expect(updated).toMatchObject({ id: post.id, title: 'New', body: 'New body' });
        });
    });

    describe('deletePost', () => {
        it('returns false when post does not exist', async () => {
            const userId = await seedUser();
            const result = await postsRepo.deletePost(999, userId);

            expect(result).toBe(false);
        });

        it('returns false when user_id does not match', async () => {
            const owner = await seedUser('owner@test.com');
            const other = await seedUser('other@test.com');
            const post = await postsRepo.createPost(owner, 'Title', 'Body');

            const result = await postsRepo.deletePost(post.id, other);

            expect(result).toBe(false);
        });

        it('deletes the post and returns true', async () => {
            const userId = await seedUser();
            const post = await postsRepo.createPost(userId, 'Title', 'Body');

            const result = await postsRepo.deletePost(post.id, userId);

            expect(result).toBe(true);
            expect(await postsRepo.findById(post.id)).toBeUndefined();
        });
    });

    describe('cascade on user delete', () => {
        it('removes posts when the user is deleted', async () => {
            const userId = await seedUser('cascade@test.com');
            const post = await postsRepo.createPost(userId, 'Title', 'Body');

            await testPool.query('DELETE FROM users WHERE id = $1', [userId]);

            expect(await postsRepo.findById(post.id)).toBeUndefined();
        });
    });
});
