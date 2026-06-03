import type { Request, Response, NextFunction } from 'express';
import { HTTP } from '../constants/http.js';

// Must have all four parameters for Express to recognize it as an error handler
function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
    console.error(err.stack);
    res.status(HTTP.STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
}

export { errorHandler };
