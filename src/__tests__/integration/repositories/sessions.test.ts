import { describe, it, expect } from 'vitest';
import { createSessionsRepo } from '../../../repositories/sessions/sessions.js';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('sessions repository', () => {
    const sessionsRepo = createSessionsRepo(testPool);
    const usersRepo = createUsersRepo(testPool);

    // Sessions reference users by id, so create one first and return its id
    async function seedUser(email = 'user@test.com'): Promise<string> {
        const id = await usersRepo.insertUser(email, 'hash');
        if (!id) throw new Error('seed user failed');
        return id;
    }

    describe('createSession and findSession', () => {
        it('creates a session that can be found', async () => {
            const userId = await seedUser();
            await sessionsRepo.createSession('token-1', userId);

            const user = await sessionsRepo.findSession('token-1');

            expect(user).toEqual({ email: 'user@test.com', id: userId });
        });

        it('returns undefined for a nonexistent token', async () => {
            const user = await sessionsRepo.findSession('nonexistent');

            expect(user).toBeUndefined();
        });
    });

    describe('deleteSession', () => {
        it('removes the session so it can no longer be found', async () => {
            const userId = await seedUser();
            await sessionsRepo.createSession('token-2', userId);

            await sessionsRepo.deleteSession('token-2');

            const user = await sessionsRepo.findSession('token-2');
            expect(user).toBeUndefined();
        });
    });

    describe('deleteExpiredSessions', () => {
        it('removes sessions older than the TTL', async () => {
            const userId = await seedUser();
            await sessionsRepo.createSession('old-token', userId);

            // Backdate the session to 30 days ago
            await testPool.query(
                "UPDATE sessions SET created_at = now() - INTERVAL '30 days' WHERE token = $1",
                ['old-token'],
            );

            await sessionsRepo.deleteExpiredSessions();

            const user = await sessionsRepo.findSession('old-token');
            expect(user).toBeUndefined();
        });

        it('keeps sessions within the TTL', async () => {
            const userId = await seedUser();
            await sessionsRepo.createSession('fresh-token', userId);

            await sessionsRepo.deleteExpiredSessions();

            const user = await sessionsRepo.findSession('fresh-token');
            expect(user).toEqual({ email: 'user@test.com', id: userId });
        });
    });

    describe('cascade on user delete', () => {
        it('removes sessions when the user is deleted', async () => {
            const userId = await seedUser('cascade@test.com');
            await sessionsRepo.createSession('cascade-token', userId);

            await testPool.query('DELETE FROM users WHERE id = $1', [userId]);

            const user = await sessionsRepo.findSession('cascade-token');
            expect(user).toBeUndefined();
        });
    });
});
