import type { Request, Response, NextFunction } from 'express';
import { AUTH } from '../../constants/auth.js';
import { HTTP } from '../../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../../errors.js';
import { hashToken } from '../../helpers/hash/hash.js';
import type { SessionsRepo } from '../../repositories/sessions/sessions.js';

function createRequireAuth(sessionsRepo: SessionsRepo) {
    async function requireAuth(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies[AUTH.COOKIE_NAME];

        // Reject requests with no session cookie
        if (!token) {
            res.status(HTTP.STATUS.UNAUTHORIZED).json(
                createErrorResponse(ERROR_CODES.AUTH.REQUIRED, 'Authentication required'),
            );
            return;
        }

        // Hash the raw token before looking it up in the database
        const user = await sessionsRepo.findSession(hashToken(token));
        if (!user) {
            res.clearCookie(AUTH.COOKIE_NAME);
            res.status(HTTP.STATUS.UNAUTHORIZED).json(
                createErrorResponse(ERROR_CODES.AUTH.SESSION_EXPIRED, 'Session expired'),
            );
            return;
        }

        // Attach authenticated user to the request for downstream handlers
        req.user = { email: user.email, id: user.id };
        next();
    }

    return requireAuth;
}

export { createRequireAuth };
