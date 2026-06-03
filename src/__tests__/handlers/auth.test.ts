import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createAuthHandlers } from '../../handlers/auth.js';
import type { AuthHelper } from '../../helpers/auth.js';
import type { SessionsRepo } from '../../repositories/sessions.js';
import type { UsersRepo } from '../../repositories/users.js';
import { createMockReq, createMockRes } from '../helpers.js';

function createMockUsersRepo(users: Map<string, string> = new Map()): UsersRepo {
    return {
        async findByEmail(email: string) {
            const hash = users.get(email);
            if (!hash) return undefined;
            return { email, password_hash: hash };
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

    describe('register', () => {
        it('returns 400 when email is missing', async () => {
            const req = createMockReq({ body: { password: 'password123' } });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(400);
            expect(res._json).toEqual({ error: 'Email and password required' });
        });

        it('returns 400 when password is missing', async () => {
            const req = createMockReq({ body: { email: 'test@test.com' } });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(400);
            expect(res._json).toEqual({ error: 'Email and password required' });
        });

        it('returns 400 when email is too long', async () => {
            const req = createMockReq({
                body: { email: 'a'.repeat(256) + '@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(400);
            expect(res._json).toEqual({ error: 'Email must be 255 characters or less' });
        });

        it('returns 400 when password is too short', async () => {
            const req = createMockReq({
                body: { email: 'test@test.com', password: 'short' },
            });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(400);
            expect(res._json).toEqual({ error: 'Password must be at least 8 characters' });
        });

        it('returns 400 when password is too long', async () => {
            const req = createMockReq({
                body: { email: 'test@test.com', password: 'a'.repeat(73) },
            });
            const res = createMockRes();

            await handlers.register(req, res);

            expect(res._status).toBe(400);
            expect(res._json).toEqual({ error: 'Password must be 72 characters or less' });
        });

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
            expect(res._json).toEqual({ error: 'Email already registered' });
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
        it('returns 400 when email is missing', async () => {
            const req = createMockReq({ body: { password: 'password123' } });
            const res = createMockRes();

            await handlers.login(req, res);

            expect(res._status).toBe(400);
        });

        it('returns 401 when user does not exist', async () => {
            const req = createMockReq({
                body: { email: 'nobody@test.com', password: 'password123' },
            });
            const res = createMockRes();

            await handlers.login(req, res);

            expect(res._status).toBe(401);
            expect(res._json).toEqual({ error: 'Invalid credentials' });
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
            expect(res._json).toEqual({ error: 'Invalid credentials' });
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
