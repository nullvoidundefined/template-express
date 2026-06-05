import pool from './db.js';
import { config } from './config.js';
import { HTTP } from './constants/http.js';
import { createApp } from './app.js';
import { logger } from './middleware/logger/logger.js';

const { app, sessionsRepo } = createApp(pool);

const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);

    // Run session cleanup once on startup as a fallback for environments without pg_cron
    if (!config.isTest) {
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
