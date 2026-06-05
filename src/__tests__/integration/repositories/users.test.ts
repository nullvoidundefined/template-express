import { describe, it, expect } from 'vitest';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('users repository', () => {
    const usersRepo = createUsersRepo(testPool);

    describe('insertUser', () => {
        it('inserts a user and returns true', async () => {
            const result = await usersRepo.insertUser('new@test.com', 'hash123');

            expect(result).toBe(true);
        });

        it('returns false on duplicate email', async () => {
            await usersRepo.insertUser('dupe@test.com', 'hash123');
            const result = await usersRepo.insertUser('dupe@test.com', 'hash456');

            expect(result).toBe(false);
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

        it('advances updated_at beyond created_at when a row is updated', async () => {
            await usersRepo.insertUser('trigger@test.com', 'hash123');

            const before = await testPool.query(
                'SELECT created_at, updated_at FROM users WHERE email = $1',
                ['trigger@test.com'],
            );
            const originalUpdatedAt: Date = before.rows[0].updated_at;

            // Use pg_sleep to ensure clock advances before the UPDATE
            await testPool.query(
                `UPDATE users SET password_hash = 'hash456' WHERE email = $1
                 AND pg_sleep(0.01) IS NOT NULL`,
                ['trigger@test.com'],
            );

            const after = await testPool.query(
                'SELECT created_at, updated_at FROM users WHERE email = $1',
                ['trigger@test.com'],
            );
            const newUpdatedAt: Date = after.rows[0].updated_at;

            expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
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
            expect(user?.created_at).toBeInstanceOf(Date);
            expect(user?.updated_at).toBeInstanceOf(Date);
        });
    });
});
