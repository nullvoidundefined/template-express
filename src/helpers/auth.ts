import type { Response } from 'express';
import crypto from 'node:crypto';
import { AUTH } from '../constants/auth.js';
import * as sessionsRepo from '../repositories/sessions.js';

async function createSession(res: Response, email: string) {
    const token = crypto.randomUUID();
    await sessionsRepo.createSession(token, email);
    res.cookie(AUTH.COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax' });
}

export { createSession };
