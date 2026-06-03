import pool from './db.js';
import { HTTP } from './constants/http.js';
import { createApp } from './app.js';
import { logger } from './middleware/logger.js';

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
    const required = ['DATABASE_URL', 'CORS_ORIGIN'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

const PORT = process.env.PORT || HTTP.DEFAULT_PORT;
const { app, sessionsRepo } = createApp(pool);

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);

    // Run session cleanup once on startup as a fallback for environments without pg_cron
    if (process.env.NODE_ENV !== 'test') {
        sessionsRepo.deleteExpiredSessions().catch((err) => {
            logger.error(err, 'Startup session cleanup failed');
        });
    }
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
