import { Router } from 'express';
import type { AuthHandlers } from '../handlers/auth.js';

function createAuthRouter(handlers: AuthHandlers) {
    const router = Router();

    router.post('/login', handlers.login);
    router.post('/logout', handlers.logout);
    router.post('/register', handlers.register);

    return router;
}

export { createAuthRouter };
