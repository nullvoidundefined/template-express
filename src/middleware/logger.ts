import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import { pinoHttp } from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
    // Silent in test to avoid noisy output
    level: isTest ? 'silent' : 'info',
    // undefined in production = raw NDJSON to stdout for log aggregators
    transport: isProduction ? undefined : { target: 'pino-pretty' },
});

// Custom serializers to keep logs concise -- only log what's useful for debugging
const httpLogger = pinoHttp({
    logger,
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
