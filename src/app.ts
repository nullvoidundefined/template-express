import type { Pool } from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config.js';
import { HTTP } from './constants/http.js';
import { createErrorResponse, ERROR_CODES } from './errors.js';
import { createAuthHandlers } from './handlers/auth.js';
import { createPostsHandlers } from './handlers/posts.js';
import { createAuthHelper } from './helpers/auth.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createIdempotencyMiddleware } from './middleware/idempotency.js';
import { httpLogger } from './middleware/logger.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
import { createRequireAuth } from './middleware/requireAuth.js';
import { createIdempotencyRepo } from './repositories/idempotency.js';
import { createPostsRepo } from './repositories/posts.js';
import { createSessionsRepo } from './repositories/sessions.js';
import { createUsersRepo } from './repositories/users.js';
import { createAuthRouter } from './routes/auth.js';
import { createHealthRouter } from './routes/health.js';
import { createPostsRouter } from './routes/posts.js';

// Builds a fully wired Express app without starting the listener.
// Accepts a pool so tests can pass a test database connection.
function createApp(pool: Pool) {
    const app = express();

    // Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
    app.use(helmet());

    // Request logging -- before all middleware so every request is captured
    app.use(httpLogger);

    // Return the request ID to the client for traceability
    app.use((req, res, next) => {
        res.setHeader('X-Request-Id', req.id as string);
        next();
    });

    // CORS must be before routes to handle preflight OPTIONS requests
    app.use(createCorsMiddleware());

    // Parse JSON bodies and cookies for all routes
    app.use(express.json({ limit: HTTP.JSON_BODY_SIZE_LIMIT }));
    app.use(cookieParser());

    // Skip rate limiting in test environment
    if (!config.isTest) {
        app.use(generalLimiter);
    }

    // Wire dependencies
    const sessionsRepo = createSessionsRepo(pool);
    const usersRepo = createUsersRepo(pool);
    const postsRepo = createPostsRepo(pool);
    const idempotencyRepo = createIdempotencyRepo(pool);
    const authHelper = createAuthHelper(sessionsRepo);
    const requireAuth = createRequireAuth(sessionsRepo);
    const idempotency = createIdempotencyMiddleware(idempotencyRepo);
    const authHandlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });
    const postsHandlers = createPostsHandlers(postsRepo);

    // Mount route groups -- auth gets a stricter rate limit in non-test environments
    if (!config.isTest) {
        app.use('/auth', authLimiter, createAuthRouter(authHandlers));
    } else {
        app.use('/auth', createAuthRouter(authHandlers));
    }
    app.use('/health', createHealthRouter(pool));
    app.use('/posts', createPostsRouter(postsHandlers, requireAuth, idempotency));

    // Catch unmatched routes
    app.use((_req, res) => {
        res.status(HTTP.STATUS.NOT_FOUND).json(
            createErrorResponse(ERROR_CODES.NOT_FOUND, 'Not found'),
        );
    });

    // Global error handler -- must be after all routes
    app.use(errorHandler);

    return { app, sessionsRepo };
}

export { createApp };
