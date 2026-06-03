import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AUTH } from '../constants/auth.js';
import { HTTP } from '../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../errors.js';
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
    // Returns the authenticated user's identity from an existing session
    function me(req: Request, res: Response) {
        res.json({ email: req.email });
    }

    async function login(req: Request, res: Response) {
        const { email, password } = req.body;

        // Verify user exists and password matches
        const user = await usersRepo.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            res.status(HTTP.STATUS.UNAUTHORIZED).json(
                createErrorResponse(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials'),
            );
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

        // Insert user, relying on primary key constraint to prevent duplicates
        const passwordHash = await bcrypt.hash(password, AUTH.LIMITS.BCRYPT_SALT_ROUNDS);
        const inserted = await usersRepo.insertUser(email, passwordHash);
        if (!inserted) {
            res.status(HTTP.STATUS.CONFLICT).json(
                createErrorResponse(ERROR_CODES.EMAIL_ALREADY_REGISTERED, 'Email already registered'),
            );
            return;
        }

        await authHelper.createSession(res, email);
        res.status(HTTP.STATUS.CREATED).json({ email });
    }

    return { login, logout, me, register };
}

export { createAuthHandlers };
export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
