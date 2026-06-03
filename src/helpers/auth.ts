import type { Response } from 'express';
import crypto from 'node:crypto';
import { AUTH } from '../constants/auth.js';
import type { SessionsRepo } from '../repositories/sessions.js';

function createAuthHelper(sessionsRepo: SessionsRepo) {
    async function createSession(res: Response, email: string) {
        const token = crypto.randomUUID();
        await sessionsRepo.createSession(token, email);
        res.cookie(AUTH.COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });
    }

    return { createSession };
}

export { createAuthHelper };
export type AuthHelper = ReturnType<typeof createAuthHelper>;
