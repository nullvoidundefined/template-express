import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema } from 'zod';
import { HTTP } from '../constants/http.js';

// Returns middleware that validates req[source] against the schema
// On success, replaces req[source] with the parsed (and coerced) data
// On failure, returns 400 with the first validation error message
function validate(schema: ZodSchema, source: 'body' | 'params' | 'query' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const firstError = result.error.issues[0].message;
            res.status(HTTP.STATUS.BAD_REQUEST).json({ error: firstError });
            return;
        }

        // Replace with parsed data so handlers receive coerced/defaulted values
        Object.assign(req[source], result.data);
        next();
    };
}

export { validate };
