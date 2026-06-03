import express from 'express';
import cookieParser from 'cookie-parser';
import pool from './db.js';
import { HTTP } from './constants/http.js';
import { createAuthHandlers } from './handlers/auth.js';
import { createPostsHandlers } from './handlers/posts.js';
import { createAuthHelper } from './helpers/auth.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpLogger, logger } from './middleware/logger.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
import { createRequireAuth } from './middleware/requireAuth.js';
import { createPostsRepo } from './repositories/posts.js';
import { createSessionsRepo } from './repositories/sessions.js';
import { createUsersRepo } from './repositories/users.js';
import { createAuthRouter } from './routes/auth.js';
import healthRouter from './routes/health.js';
import { createPostsRouter } from './routes/posts.js';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
    const required = ['DATABASE_URL', 'CORS_ORIGIN'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

const app = express();
const PORT = process.env.PORT || HTTP.DEFAULT_PORT;

// Request logging -- before all middleware so every request is captured
app.use(httpLogger);

// CORS must be before routes to handle preflight OPTIONS requests
app.use(createCorsMiddleware());

// Parse JSON bodies and cookies for all routes
app.use(express.json({ limit: HTTP.JSON_BODY_SIZE_LIMIT }));
app.use(cookieParser());

// Skip rate limiting in test environment
if (process.env.NODE_ENV !== 'test') {
    app.use(generalLimiter);
}

// Wire dependencies
const sessionsRepo = createSessionsRepo(pool);
const usersRepo = createUsersRepo(pool);
const postsRepo = createPostsRepo(pool);
const authHelper = createAuthHelper(sessionsRepo);
const requireAuth = createRequireAuth(sessionsRepo);
const authHandlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });
const postsHandlers = createPostsHandlers(postsRepo);

// Mount route groups -- auth gets a stricter rate limit in non-test environments
if (process.env.NODE_ENV !== 'test') {
    app.use('/auth', authLimiter, createAuthRouter(authHandlers));
} else {
    app.use('/auth', createAuthRouter(authHandlers));
}
app.use('/health', healthRouter);
app.use('/posts', createPostsRouter(postsHandlers, requireAuth));

// Catch unmatched routes
app.use((_req, res) => {
    res.status(HTTP.STATUS.NOT_FOUND).json({ error: 'Not found' });
});

// Global error handler -- must be after all routes
app.use(errorHandler);

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

function gracefulShutdown(signal: string) {
    logger.info(`${signal} received -- shutting down`);

    // Force exit if shutdown takes too long
    const forceExit = setTimeout(() => {
        logger.error('Shutdown timed out -- forcing exit');
        process.exit(1);
    }, HTTP.GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    // Stop accepting new connections, wait for in-flight requests to finish
    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await pool.end();
            logger.info('Database pool closed');
        } catch (err) {
            logger.error(err, 'Error closing database pool');
        }

        // Clean shutdown completed -- cancel the force-exit timer
        clearTimeout(forceExit);
        process.exit(0);
    });
}

// SIGTERM: sent by Railway/Docker on deploy; SIGINT: Ctrl-C in local dev
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
