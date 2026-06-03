import type { Request, Response, NextFunction } from 'express';
import type { IdempotencyRepo } from '../repositories/idempotency.js';

// Only applies to POST and PUT -- GET and DELETE are naturally idempotent.
// Requests without an Idempotency-Key header pass through unchanged.
function createIdempotencyMiddleware(idempotencyRepo: IdempotencyRepo) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const key = req.headers['idempotency-key'] as string | undefined;

        // No key provided -- skip idempotency check
        if (!key || (req.method !== 'POST' && req.method !== 'PUT')) {
            next();
            return;
        }

        // Requires authentication so we can scope keys per user
        if (!req.email) {
            next();
            return;
        }

        // Check if this key has already been processed
        const existing = await idempotencyRepo.findByKey(key, req.email);
        if (existing) {
            res.status(existing.status_code).json(existing.response_body);
            return;
        }

        // Intercept res.json to capture the response before it's sent
        const originalJson = res.json.bind(res);
        res.json = function (body: unknown) {
            // Store the response for future replays of this key
            idempotencyRepo
                .store(key, req.email!, res.statusCode, body)
                .catch(() => {
                    // Storage failure shouldn't break the response
                    req.log.error('Failed to store idempotency key');
                });
            return originalJson(body);
        };

        next();
    };
}

export { createIdempotencyMiddleware };
