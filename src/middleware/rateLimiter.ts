import rateLimit from 'express-rate-limit';
import { HTTP } from '../constants/http.js';

// Strict limiter for auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
    max: HTTP.RATE_LIMIT.AUTH_MAX,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    windowMs: HTTP.RATE_LIMIT.AUTH_WINDOW_MS,
});

// General limiter for all other routes to prevent API abuse
const generalLimiter = rateLimit({
    max: HTTP.RATE_LIMIT.GENERAL_MAX,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    windowMs: HTTP.RATE_LIMIT.GENERAL_WINDOW_MS,
});

export { authLimiter, generalLimiter };
