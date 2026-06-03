import type { Response } from 'express';
import crypto from 'node:crypto';
import { AUTH } from '../constants/auth.js';
import type { SessionsRepo } from '../repositories/sessions.js';
import { hashToken } from './hash.js';

function createAuthHelper(sessionsRepo: SessionsRepo) {
    async function createSession(res: Response, email: string) {
        const token = crypto.randomUUID();
        // Store the hash in the database, send the raw token to the client
        await sessionsRepo.createSession(hashToken(token), email);
        // secure: true in production prevents cookies from being sent over plain HTTP
        res.cookie(AUTH.COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
    }

    return { createSession };
}

export { createAuthHelper };
export type AuthHelper = ReturnType<typeof createAuthHelper>;
