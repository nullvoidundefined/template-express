import type { Request, Response, NextFunction } from 'express';
import { HTTP } from '../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../errors.js';

// Postgres error codes that indicate the database is unavailable, not a bug in our code
const PG_UNAVAILABLE_CODES = new Set([
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '57P01', // admin_shutdown
    '57P03', // cannot_connect_now
]);

function isDatabaseError(err: Error): boolean {
    const code = (err as Error & { code?: string }).code;

    // pg driver connection errors
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
        return true;
    }

    // Postgres server-side connection/shutdown errors
    if (code && PG_UNAVAILABLE_CODES.has(code)) {
        return true;
    }

    return false;
}

// Must have all four parameters for Express to recognize it as an error handler
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    // pino-http attaches a logger to each request with the request ID already bound
    req.log.error(err);

    if (isDatabaseError(err)) {
        res.status(HTTP.STATUS.SERVICE_UNAVAILABLE).json(
            createErrorResponse(ERROR_CODES.SERVER.DATABASE_UNAVAILABLE, 'Service temporarily unavailable'),
        );
        return;
    }

    res.status(HTTP.STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(ERROR_CODES.SERVER.INTERNAL_ERROR, 'Internal server error'),
    );
}

export { errorHandler };
