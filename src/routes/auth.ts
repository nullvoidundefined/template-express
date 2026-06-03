import { Router } from 'express';
import type { AuthHandlers } from '../handlers/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';

function createAuthRouter(handlers: AuthHandlers) {
    const router = Router();

    router.post('/login', validate(loginSchema), handlers.login);
    router.post('/logout', handlers.logout);
    router.post('/register', validate(registerSchema), handlers.register);

    return router;
}

export { createAuthRouter };
