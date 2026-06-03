import { describe, it, expect } from 'vitest';
import { errorHandler } from '../../middleware/errorHandler.js';
import { createMockReq, createMockRes } from '../helpers.js';

// pino-http attaches req.log -- mock it for unit tests
function createReqWithLog(overrides: Record<string, unknown> = {}) {
    const req = createMockReq(overrides);
    (req as unknown as Record<string, unknown>).log = { error: () => {} };
    return req;
}

describe('errorHandler', () => {
    it('returns 500 for generic errors', () => {
        const req = createReqWithLog();
        const res = createMockRes();

        errorHandler(new Error('something broke'), req, res, () => {});

        expect(res._status).toBe(500);
        expect(res._json).toEqual({ code: 'SERVER_INTERNAL_ERROR', error: 'Internal server error' });
    });

    it('returns 503 for ECONNREFUSED (database connection refused)', () => {
        const req = createReqWithLog();
        const res = createMockRes();
        const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

        errorHandler(err, req, res, () => {});

        expect(res._status).toBe(503);
        expect(res._json).toEqual({
            code: 'SERVER_DATABASE_UNAVAILABLE',
            error: 'Service temporarily unavailable',
        });
    });

    it('returns 503 for Postgres admin_shutdown', () => {
        const req = createReqWithLog();
        const res = createMockRes();
        const err = Object.assign(new Error('server closed'), { code: '57P01' });

        errorHandler(err, req, res, () => {});

        expect(res._status).toBe(503);
        expect(res._json).toEqual({
            code: 'SERVER_DATABASE_UNAVAILABLE',
            error: 'Service temporarily unavailable',
        });
    });

    it('returns 503 for ETIMEDOUT', () => {
        const req = createReqWithLog();
        const res = createMockRes();
        const err = Object.assign(new Error('connection timed out'), { code: 'ETIMEDOUT' });

        errorHandler(err, req, res, () => {});

        expect(res._status).toBe(503);
    });
});
