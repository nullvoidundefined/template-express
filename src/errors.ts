// Machine-readable error codes -- clients switch on these, not on human-readable messages
const ERROR_CODES = {
    // Auth: no session cookie present
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    // Auth: duplicate email on registration
    EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
    // Server: database connection or query failed -- client should retry later
    DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
    // Server: unhandled error in a handler or middleware
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    // Auth: wrong email or password on login
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    // Routing: no route matched the request URL
    NOT_FOUND: 'NOT_FOUND',
    // Posts: post doesn't exist or belongs to another user
    POST_NOT_FOUND: 'POST_NOT_FOUND',
    // Rate limiting: too many requests in the current window
    RATE_LIMITED: 'RATE_LIMITED',
    // Auth: session token not found in DB or expired past TTL
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    // Input: Zod schema validation failed on request body, params, or query
    VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

interface ErrorResponse {
    code: ErrorCode;
    error: string;
}

function createErrorResponse(code: ErrorCode, message: string): ErrorResponse {
    return { code, error: message };
}

export { createErrorResponse, ERROR_CODES };
export type { ErrorCode, ErrorResponse };
