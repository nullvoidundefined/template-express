import pino from 'pino';
import pinoHttp from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
    // Silent in test to avoid noisy output
    level: isTest ? 'silent' : 'info',
    transport: isProduction ? undefined : { target: 'pino-pretty' },
});

const httpLogger = pinoHttp({ logger });

export { httpLogger, logger };
