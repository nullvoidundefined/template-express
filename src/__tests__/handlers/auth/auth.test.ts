import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createAuthHandlers } from '../../../handlers/auth/auth.js';
import type { AuthHelper } from '../../../helpers/auth/auth.js';
import type { SessionsRepo } from '../../../repositories/sessions/sessions.js';
import type { UsersRepo } from '../../../repositories/users/users.js';
import { createMockReq, createMockRes } from '../../helpers.js';

function createMockUsersRepo(users: Map<string, string> = new Map()): UsersRepo {
    return {
        async findByEmail(email: string) {
            const hash = users.get(email);
            if (!hash) return undefined;
            const now = new Date();
            return { created_at: now, email, password_hash: hash, updated_at: now };
        },
        async insertUser(email: string, passwordHash: string) {
            if (users.has(email)) return false;
            users.set(email, passwordHash);
            return true;
        },
    };
}

function createMockSessionsRepo(): SessionsRepo {
    return {
        createSession: async () => {},
        deleteExpiredSessions: async () => {},
        deleteSession: async () => {},
        findSession: async () => undefined,
    };
}

function createMockAuthHelper(): AuthHelper {
    return {
        createSession: async () => {},
    };
}

describe('auth handlers', () => {
    let usersRepo: UsersRepo;
    let sessionsRepo: SessionsRepo;
    let authHelper: AuthHelper;
    let handlers: ReturnType<typeof createAuthHandlers>;

    beforeEach(() => {
        usersRepo = createMockUsersRepo();
        sessionsRepo = createMockSessionsRepo();
        authHelper = createMockAuthHelper();
        handlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });
    });

    describe('me', () => {
        it('returns the authenticated email', async () => {
            const req = createMockReq({ email: 'user@test.com' });
            const res = createMockRes();

            handlers.me(req, res);

            expect(res._json).toEqual({ email: 'user@test.com' });
        });
    });

    describe('register', () => {
        it('returns 409 when email is already registered', async () => {
            const users = new Map([['taken@test.com', 'hash']]);
            usersRepo = createMockUsersRepo(users);
            handlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });

            const req = createMockReq({
                body: { email: 'taken@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(409);
            expect(res._json).toEqual({ code: 'AUTH_EMAIL_ALREADY_REGISTERED', error: 'Email already registered' });
        });

        it('returns 201 with email on success', async () => {
            const req = createMockReq({
                body: { email: 'new@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(201);
            expect(res._json).toEqual({ email: 'new@test.com' });
        });
    });

    describe('login', () => {
        it('returns 401 when user does not exist', async () => {
            const req = createMockReq({
                body: { email: 'nobody@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.login(req, res);

            expect(res._status).toBe(401);
            expect(res._json).toEqual({ code: 'AUTH_INVALID_CREDENTIALS', error: 'Invalid credentials' });
        });

        it('returns 401 when password is wrong', async () => {
            const hash = await bcrypt.hash('correct', 10);
            const users = new Map([['user@test.com', hash]]);
            usersRepo = createMockUsersRepo(users);
            handlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });

            const req = createMockReq({
                body: { email: 'user@test.com', password: 'wrong' },
            });
            const res = createMockRes();

            await handlers.login(req, res);

            expect(res._status).toBe(401);
            expect(res._json).toEqual({ code: 'AUTH_INVALID_CREDENTIALS', error: 'Invalid credentials' });
        });

        it('returns 200 with email on success', async () => {
            const hash = await bcrypt.hash('password123', 10);
            const users = new Map([['user@test.com', hash]]);
            usersRepo = createMockUsersRepo(users);
            handlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });

            const req = createMockReq({
                body: { email: 'user@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.login(req, res);

            expect(res._status).toBe(200);
            expect(res._json).toEqual({ email: 'user@test.com' });
        });
    });

    describe('logout', () => {
        it('clears the session cookie', async () => {
            const req = createMockReq({ cookies: { session: 'some-token' } });
            const res = createMockRes();

            await handlers.logout(req, res);

            expect(res._clearedCookies).toContain('session');
            expect(res._json).toEqual({ message: 'Logged out' });
        });

        it('succeeds even without a session cookie', async () => {
            const req = createMockReq();
            const res = createMockRes();

            await handlers.logout(req, res);

            expect(res._json).toEqual({ message: 'Logged out' });
        });
    });
});
