import { describe, it, expect } from 'vitest';
import { createIdempotencyRepo } from '../../../repositories/idempotency/idempotency.js';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('idempotency repository', () => {
    const idempotencyRepo = createIdempotencyRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    async function seedUser(email = 'user@test.com'): Promise<string> {
        const id = await usersRepo.insertUser(email, 'hash');
        if (!id) throw new Error('seed user failed');
        return id;
    }

    describe('store and findByKey', () => {
        it('stores a response and retrieves it by key', async () => {
            const userId = await seedUser();
            await idempotencyRepo.store('key-1', userId, 201, { id: 1 });

            const result = await idempotencyRepo.findByKey('key-1', userId);

            expect(result).toEqual({ status_code: 201, response_body: { id: 1 } });
        });

        it('returns undefined for an unknown key', async () => {
            const userId = await seedUser();
            const result = await idempotencyRepo.findByKey('nonexistent', userId);

            expect(result).toBeUndefined();
        });

        it('scopes keys per user', async () => {
            const userA = await seedUser('a@test.com');
            const userB = await seedUser('b@test.com');
            await idempotencyRepo.store('shared-key', userA, 201, { owner: 'a' });

            const result = await idempotencyRepo.findByKey('shared-key', userB);

            expect(result).toBeUndefined();
        });

        it('returns undefined for expired keys', async () => {
            const userId = await seedUser();
            await idempotencyRepo.store('old-key', userId, 201, { id: 1 });

            // Backdate to 25 hours ago (past the 24-hour TTL)
            await testPool.query(
                "UPDATE idempotency_keys SET created_at = now() - INTERVAL '25 hours' WHERE key = $1",
                ['old-key'],
            );

            const result = await idempotencyRepo.findByKey('old-key', userId);

            expect(result).toBeUndefined();
        });
    });

    describe('cascade on user delete', () => {
        it('removes keys when the user is deleted', async () => {
            const userId = await seedUser('cascade@test.com');
            await idempotencyRepo.store('key-2', userId, 200, {});

            await testPool.query('DELETE FROM users WHERE id = $1', [userId]);

            const result = await idempotencyRepo.findByKey('key-2', userId);
            expect(result).toBeUndefined();
        });
    });
});
