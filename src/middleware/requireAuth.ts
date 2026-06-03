import type { Request, Response, NextFunction } from 'express';
import { AUTH } from '../constants/auth.js';
import { HTTP } from '../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../errors.js';
import { hashToken } from '../helpers/hash.js';
import type { SessionsRepo } from '../repositories/sessions.js';

function createRequireAuth(sessionsRepo: SessionsRepo) {
    async function requireAuth(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies[AUTH.COOKIE_NAME];

        // Reject requests with no session cookie
        if (!token) {
            res.status(HTTP.STATUS.UNAUTHORIZED).json(
                createErrorResponse(ERROR_CODES.AUTH_REQUIRED, 'Authentication required'),
            );
            return;
        }

        // Hash the raw token before looking it up in the database
        const email = await sessionsRepo.findSession(hashToken(token));
        if (!email) {
            res.clearCookie(AUTH.COOKIE_NAME);
            res.status(HTTP.STATUS.UNAUTHORIZED).json(
                createErrorResponse(ERROR_CODES.SESSION_EXPIRED, 'Session expired'),
            );
            return;
        }

        // Attach authenticated user to the request for downstream handlers
        req.email = email;
        next();
    }

    return requireAuth;
}

export { createRequireAuth };
