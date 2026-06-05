import { describe, it, expect } from 'vitest';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('users repository', () => {
    const usersRepo = createUsersRepo(testPool);

    describe('insertUser', () => {
        it('inserts a user and returns a uuid id', async () => {
            const result = await usersRepo.insertUser('new@test.com', 'hash123');

            expect(result).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
        });

        it('returns null on duplicate email', async () => {
            await usersRepo.insertUser('dupe@test.com', 'hash123');
            const result = await usersRepo.insertUser('dupe@test.com', 'hash456');

            expect(result).toBeNull();
        });

        it('persists the returned id as the row primary key', async () => {
            const id = await usersRepo.insertUser('pk@test.com', 'hash123');

            const found = await usersRepo.findByEmail('pk@test.com');
            expect(found?.id).toBe(id);
        });

        it('populates created_at and updated_at on insert', async () => {
            await usersRepo.insertUser('timestamps@test.com', 'hash123');

            const result = await testPool.query(
                'SELECT created_at, updated_at FROM users WHERE email = $1',
                ['timestamps@test.com'],
            );
            const row = result.rows[0];

            expect(row).toBeDefined();
            expect(row.created_at).toBeInstanceOf(Date);
            expect(row.updated_at).toBeInstanceOf(Date);
        });

        it('sets updated_at to NOW() on update via trigger, making it later than a backdated created_at', async () => {
            const id = await usersRepo.insertUser('trigger@test.com', 'hash123');

            // Push created_at one hour into the past in the same statement the trigger reacts to.
            // The BEFORE UPDATE trigger sets updated_at = NOW() (transaction start time).
            // After this UPDATE: created_at is 1 hour ago, updated_at is the current transaction time.
            // The one-hour gap is deterministic regardless of inter-statement wall-clock jitter.
            await testPool.query(
                `UPDATE users SET created_at = created_at - INTERVAL '1 hour' WHERE id = $1`,
                [id],
            );

            const result = await testPool.query(
                'SELECT created_at, updated_at FROM users WHERE id = $1',
                [id],
            );
            const row = result.rows[0];

            expect(row.updated_at.getTime()).toBeGreaterThan(row.created_at.getTime());
        });
    });

    describe('findByEmail', () => {
        it('returns undefined when user does not exist', async () => {
            const user = await usersRepo.findByEmail('nobody@test.com');

            expect(user).toBeUndefined();
        });

        it('returns the user when found', async () => {
            await usersRepo.insertUser('found@test.com', 'hash123');

            const user = await usersRepo.findByEmail('found@test.com');

            expect(user).toMatchObject({ email: 'found@test.com', password_hash: 'hash123' });
            expect(user?.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
            );
            expect(user?.created_at).toBeInstanceOf(Date);
            expect(user?.updated_at).toBeInstanceOf(Date);
        });
    });
});
