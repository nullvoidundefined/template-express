import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AUTH } from '../constants/auth.js';
import { HTTP } from '../constants/http.js';
import type { AuthHelper } from '../helpers/auth.js';
import { hashToken } from '../helpers/hash.js';
import type { SessionsRepo } from '../repositories/sessions.js';
import type { UsersRepo } from '../repositories/users.js';

interface AuthHandlerDeps {
    authHelper: AuthHelper;
    sessionsRepo: SessionsRepo;
    usersRepo: UsersRepo;
}

function createAuthHandlers({ authHelper, sessionsRepo, usersRepo }: AuthHandlerDeps) {
    async function login(req: Request, res: Response) {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({
                error: AUTH.ERRORS.EMAIL_AND_PASSWORD_REQUIRED,
            });
            return;
        }

        // Verify user exists and password matches
        const user = await usersRepo.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            res.status(HTTP.STATUS.UNAUTHORIZED).json({ error: AUTH.ERRORS.INVALID_CREDENTIALS });
            return;
        }

        await authHelper.createSession(res, email);
        res.json({ email });
    }

    async function logout(req: Request, res: Response) {
        const token = req.cookies[AUTH.COOKIE_NAME];

        // Hash the raw token before deleting from the database
        if (token) {
            await sessionsRepo.deleteSession(hashToken(token));
        }

        res.clearCookie(AUTH.COOKIE_NAME);
        res.json({ message: 'Logged out' });
    }

    async function register(req: Request, res: Response) {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({
                error: AUTH.ERRORS.EMAIL_AND_PASSWORD_REQUIRED,
            });
            return;
        }

        // Validate input lengths
        if (email.length > AUTH.LIMITS.EMAIL_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: AUTH.ERRORS.EMAIL_TOO_LONG });
            return;
        }
        if (password.length < AUTH.LIMITS.PASSWORD_MIN) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: AUTH.ERRORS.PASSWORD_TOO_SHORT });
            return;
        }
        if (password.length > AUTH.LIMITS.PASSWORD_MAX) {
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: AUTH.ERRORS.PASSWORD_TOO_LONG });
            return;
        }

        // Insert user, relying on primary key constraint to prevent duplicates
        const passwordHash = await bcrypt.hash(password, 10);
        const inserted = await usersRepo.insertUser(email, passwordHash);
        if (!inserted) {
            res.status(HTTP.STATUS.CONFLICT).json({ error: AUTH.ERRORS.EMAIL_ALREADY_REGISTERED });
            return;
        }

        await authHelper.createSession(res, email);
        res.status(HTTP.STATUS.CREATED).json({ email });
    }

    return { login, logout, register };
}

export { createAuthHandlers };
export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
