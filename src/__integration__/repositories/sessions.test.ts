import { describe, it, expect } from 'vitest';
import { createSessionsRepo } from '../../repositories/sessions.js';
import { createUsersRepo } from '../../repositories/users.js';
import { testPool } from '../setup.js';

describe('sessions repository', () => {
    const sessionsRepo = createSessionsRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    // Sessions reference users, so create one first
    async function seedUser(email = 'user@test.com') {
        await usersRepo.insertUser(email, 'hash');
    }

    describe('createSession and findSession', () => {
        it('creates a session that can be found', async () => {
            await seedUser();
            await sessionsRepo.createSession('token-1', 'user@test.com');

            const email = await sessionsRepo.findSession('token-1');

            expect(email).toBe('user@test.com');
        });

        it('returns undefined for a nonexistent token', async () => {
            const email = await sessionsRepo.findSession('nonexistent');

            expect(email).toBeUndefined();
        });
    });

    describe('deleteSession', () => {
        it('removes the session so it can no longer be found', async () => {
            await seedUser();
            await sessionsRepo.createSession('token-2', 'user@test.com');

            await sessionsRepo.deleteSession('token-2');

            const email = await sessionsRepo.findSession('token-2');
            expect(email).toBeUndefined();
        });
    });

    describe('deleteExpiredSessions', () => {
        it('removes sessions older than the TTL', async () => {
            await seedUser();
            await sessionsRepo.createSession('old-token', 'user@test.com');

            // Backdate the session to 30 days ago
            await testPool.query(
                "UPDATE sessions SET created_at = now() - INTERVAL '30 days' WHERE token = $1",
                ['old-token'],
            );

            await sessionsRepo.deleteExpiredSessions();

            const email = await sessionsRepo.findSession('old-token');
            expect(email).toBeUndefined();
        });

        it('keeps sessions within the TTL', async () => {
            await seedUser();
            await sessionsRepo.createSession('fresh-token', 'user@test.com');

            await sessionsRepo.deleteExpiredSessions();

            const email = await sessionsRepo.findSession('fresh-token');
            expect(email).toBe('user@test.com');
        });
    });

    describe('cascade on user delete', () => {
        it('removes sessions when the user is deleted', async () => {
            await seedUser('cascade@test.com');
            await sessionsRepo.createSession('cascade-token', 'cascade@test.com');

            await testPool.query('DELETE FROM users WHERE email = $1', ['cascade@test.com']);

            const email = await sessionsRepo.findSession('cascade-token');
            expect(email).toBeUndefined();
        });
    });
});
