import type { Request, Response, NextFunction } from 'express';
import { HTTP } from '../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../errors.js';

// Must have all four parameters for Express to recognize it as an error handler
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    // pino-http attaches a logger to each request with the request ID already bound
    req.log.error(err);
    res.status(HTTP.STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Internal server error'),
    );
}

export { errorHandler };
