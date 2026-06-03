import express from 'express';
import cookieParser from 'cookie-parser';
import pool from './db.js';
import { HTTP } from './constants/http.js';
import { createAuthHandlers } from './handlers/auth.js';
import { createPostsHandlers } from './handlers/posts.js';
import { createAuthHelper } from './helpers/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
import { createRequireAuth } from './middleware/requireAuth.js';
import { createPostsRepo } from './repositories/posts.js';
import { createSessionsRepo } from './repositories/sessions.js';
import { createUsersRepo } from './repositories/users.js';
import { createAuthRouter } from './routes/auth.js';
import healthRouter from './routes/health.js';
import { createPostsRouter } from './routes/posts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON bodies and cookies for all routes
app.use(express.json({ limit: HTTP.BODY_LIMIT }));
app.use(cookieParser());

// Apply general rate limit to all routes
app.use(generalLimiter);

// Wire dependencies
const sessionsRepo = createSessionsRepo(pool);
const usersRepo = createUsersRepo(pool);
const postsRepo = createPostsRepo(pool);
const authHelper = createAuthHelper(sessionsRepo);
const requireAuth = createRequireAuth(sessionsRepo);
const authHandlers = createAuthHandlers({ authHelper, sessionsRepo, usersRepo });
const postsHandlers = createPostsHandlers(postsRepo);

// Mount route groups -- auth gets a stricter rate limit
app.use('/auth', authLimiter, createAuthRouter(authHandlers));
app.use('/health', healthRouter);
app.use('/posts', createPostsRouter(postsHandlers, requireAuth));

// Catch unmatched routes
app.use((_req, res) => {
    res.status(HTTP.STATUS.NOT_FOUND).json({ error: 'Not found' });
});

// Global error handler -- must be after all routes
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
