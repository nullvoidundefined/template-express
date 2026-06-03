import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema } from 'zod';
import { HTTP } from '../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../errors.js';

// Returns middleware that validates req[source] against the schema
// On success, replaces req[source] with the parsed (and coerced) data
// On failure, returns 400 with the first validation error message
function validate(schema: ZodSchema, source: 'body' | 'params' | 'query' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const firstError = result.error.issues[0].message;
            res.status(HTTP.STATUS.BAD_REQUEST).json(
                createErrorResponse(ERROR_CODES.VALIDATION_ERROR, firstError),
            );
            return;
        }

        // Mutate in place because req.body/params/query are read-only properties
        Object.assign(req[source], result.data);
        next();
    };
}

export { validate };
