import { describe, it, expect, beforeEach } from 'vitest';
import { hashToken } from '../../../helpers/hash/hash.js';
import { createRequireAuth } from '../../../middleware/requireAuth/requireAuth.js';
import type { SessionsRepo } from '../../../repositories/sessions/sessions.js';
import { createMockReq, createMockRes } from '../../helpers.js';

function createMockSessionsRepo(
    validTokens: Map<string, { email: string; id: string }> = new Map(),
): SessionsRepo {
    return {
        createSession: async () => {},
        deleteExpiredSessions: async () => {},
        deleteSession: async () => {},
        findSession: async (token: string) => validTokens.get(token),
    };
}

describe('requireAuth middleware', () => {
    let sessionsRepo: SessionsRepo;
    let requireAuth: ReturnType<typeof createRequireAuth>;

    beforeEach(() => {
        sessionsRepo = createMockSessionsRepo();
        requireAuth = createRequireAuth(sessionsRepo);
    });

    it('returns 401 when no session cookie is present', async () => {
        const req = createMockReq();
        const res = createMockRes();
        let nextCalled = false;

        await requireAuth(req, res, () => {
            nextCalled = true;
        });

        expect(res._status).toBe(401);
        expect(res._json).toEqual({ code: 'AUTH_REQUIRED', error: 'Authentication required' });
        expect(nextCalled).toBe(false);
    });

    it('returns 401 and clears cookie when session is expired', async () => {
        const req = createMockReq({ cookies: { session: 'expired-token' } });
        const res = createMockRes();
        let nextCalled = false;

        await requireAuth(req, res, () => {
            nextCalled = true;
        });

        expect(res._status).toBe(401);
        expect(res._json).toEqual({ code: 'AUTH_SESSION_EXPIRED', error: 'Session expired' });
        expect(res._clearedCookies).toContain('session');
        expect(nextCalled).toBe(false);
    });

    it('sets req.user and calls next on valid session', async () => {
        // Mock stores the hashed token since middleware hashes before lookup
        const userId = '11111111-1111-1111-1111-111111111111';
        const tokens = new Map([
            [hashToken('valid-token'), { email: 'user@test.com', id: userId }],
        ]);
        sessionsRepo = createMockSessionsRepo(tokens);
        requireAuth = createRequireAuth(sessionsRepo);

        const req = createMockReq({ cookies: { session: 'valid-token' } });
        const res = createMockRes();
        let nextCalled = false;

        await requireAuth(req, res, () => {
            nextCalled = true;
        });

        expect(req.user).toEqual({ email: 'user@test.com', id: userId });
        expect(nextCalled).toBe(true);
    });
});
