import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { AuthHandlers } from '../../handlers/auth/auth.js';
import { validate } from '../../middleware/validate/validate.js';
import { loginSchema, registerSchema } from '../../schemas/auth/auth.js';

function createAuthRouter(handlers: AuthHandlers, requireAuth: RequestHandler) {
    const router = Router();

    router.get('/me', requireAuth, handlers.me);
    router.post('/login', validate(loginSchema), handlers.login);
    router.post('/logout', handlers.logout);
    router.post('/register', validate(registerSchema), handlers.register);

    return router;
}

export { createAuthRouter };
