import { describe, it, expect } from 'vitest';
import { createIdempotencyRepo } from '../../../repositories/idempotency/idempotency.js';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('idempotency repository', () => {
    const idempotencyRepo = createIdempotencyRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    async function seedUser(email = 'user@test.com') {
        await usersRepo.insertUser(email, 'hash');
    }

    describe('store and findByKey', () => {
        it('stores a response and retrieves it by key', async () => {
            await seedUser();
            await idempotencyRepo.store('key-1', 'user@test.com', 201, { id: 1 });

            const result = await idempotencyRepo.findByKey('key-1', 'user@test.com');

            expect(result).toEqual({ status_code: 201, response_body: { id: 1 } });
        });

        it('returns undefined for an unknown key', async () => {
            const result = await idempotencyRepo.findByKey('nonexistent', 'user@test.com');

            expect(result).toBeUndefined();
        });

        it('scopes keys per user', async () => {
            await seedUser('a@test.com');
            await seedUser('b@test.com');
            await idempotencyRepo.store('shared-key', 'a@test.com', 201, { owner: 'a' });

            const result = await idempotencyRepo.findByKey('shared-key', 'b@test.com');

            expect(result).toBeUndefined();
        });

        it('returns undefined for expired keys', async () => {
            await seedUser();
            await idempotencyRepo.store('old-key', 'user@test.com', 201, { id: 1 });

            // Backdate to 25 hours ago (past the 24-hour TTL)
            await testPool.query(
                "UPDATE idempotency_keys SET created_at = now() - INTERVAL '25 hours' WHERE key = $1",
                ['old-key'],
            );

            const result = await idempotencyRepo.findByKey('old-key', 'user@test.com');

            expect(result).toBeUndefined();
        });
    });

    describe('cascade on user delete', () => {
        it('removes keys when the user is deleted', async () => {
            await seedUser('cascade@test.com');
            await idempotencyRepo.store('key-2', 'cascade@test.com', 200, {});

            await testPool.query('DELETE FROM users WHERE email = $1', ['cascade@test.com']);

            const result = await idempotencyRepo.findByKey('key-2', 'cascade@test.com');
            expect(result).toBeUndefined();
        });
    });
});
