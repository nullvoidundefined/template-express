import type { Response } from 'express';
import crypto from 'node:crypto';
import { config } from '../../config.js';
import { AUTH } from '../../constants/auth.js';
import type { SessionsRepo } from '../../repositories/sessions/sessions.js';
import { hashToken } from '../hash/hash.js';

function createAuthHelper(sessionsRepo: SessionsRepo) {
    async function createSession(res: Response, userId: string) {
        const token = crypto.randomUUID();
        // Store the hash in the database, send the raw token to the client
        await sessionsRepo.createSession(hashToken(token), userId);
        // secure: true in production prevents cookies from being sent over plain HTTP
        res.cookie(AUTH.COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: config.isProduction,
        });
    }

    return { createSession };
}

export { createAuthHelper };
export type AuthHelper = ReturnType<typeof createAuthHelper>;
