import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from '../config.js';

const logger = pino({
    // Silent in test to avoid noisy output
    level: config.isTest ? 'silent' : 'info',
    // undefined in production = raw NDJSON to stdout for log aggregators
    transport: config.isProduction ? undefined : { target: 'pino-pretty' },
});

// Custom serializers to keep logs concise -- only log what's useful for debugging
const httpLogger = pinoHttp({
    logger,
    // Reuse the client's request ID if present, otherwise generate one
    genReqId: (req) => {
        return (req.headers['x-request-id'] as string) || crypto.randomUUID();
    },
    serializers: {
        req(req: IncomingMessage) {
            return {
                method: req.method,
                url: req.url,
            };
        },
        res(res: ServerResponse) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});

export { httpLogger, logger };
