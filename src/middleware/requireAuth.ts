import type { Request, Response, NextFunction } from 'express';
import { AUTH } from '../constants/auth.js';
import { HTTP } from '../constants/http.js';
import type { SessionsRepo } from '../repositories/sessions.js';

function createRequireAuth(sessionsRepo: SessionsRepo) {
    async function requireAuth(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies[AUTH.COOKIE_NAME];

        // Reject requests with no session cookie
        if (!token) {
            res.status(HTTP.STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
            return;
        }

        // Validate token against database and check TTL
        const email = await sessionsRepo.findSession(token);
        if (!email) {
            res.clearCookie(AUTH.COOKIE_NAME);
            res.status(HTTP.STATUS.UNAUTHORIZED).json({ error: 'Session expired' });
            return;
        }

        // Attach authenticated user to the request for downstream handlers
        req.email = email;
        next();
    }

    return requireAuth;
}

export { createRequireAuth };
