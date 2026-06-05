import rateLimit from 'express-rate-limit';
import { HTTP } from '../../constants/http.js';
import { createErrorResponse, ERROR_CODES } from '../../errors.js';

const rateLimitResponse = createErrorResponse(
    ERROR_CODES.RATE_LIMIT.EXCEEDED,
    'Too many requests, please try again later',
);

// Strict limiter for auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
    max: HTTP.RATE_LIMIT.AUTH_MAX_REQUESTS,
    message: rateLimitResponse,
    standardHeaders: true,
    windowMs: HTTP.RATE_LIMIT.AUTH_RESET_INTERVAL_MS,
});

// General limiter for all other routes to prevent API abuse
const generalLimiter = rateLimit({
    max: HTTP.RATE_LIMIT.GLOBAL_MAX_REQUESTS,
    message: rateLimitResponse,
    standardHeaders: true,
    windowMs: HTTP.RATE_LIMIT.GLOBAL_RESET_INTERVAL_MS,
});

export { authLimiter, generalLimiter };
