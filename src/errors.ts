// Machine-readable error codes -- clients switch on these, not on human-readable messages.
// Nested by domain for code-side readability; string values stay flat for the API contract.
const ERROR_CODES = {
    AUTH: {
        // No session cookie present
        REQUIRED: 'AUTH_REQUIRED',
        // Duplicate email on registration
        EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
        // Wrong email or password on login
        INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
        // Session token not found in DB or expired past TTL
        SESSION_EXPIRED: 'SESSION_EXPIRED',
    },
    INPUT: {
        // Zod schema validation failed on request body, params, or query
        VALIDATION_ERROR: 'VALIDATION_ERROR',
    },
    POSTS: {
        // Post doesn't exist or belongs to another user
        NOT_FOUND: 'POST_NOT_FOUND',
    },
    RATE_LIMIT: {
        // Too many requests in the current window
        EXCEEDED: 'RATE_LIMITED',
    },
    ROUTING: {
        // No route matched the request URL
        NOT_FOUND: 'NOT_FOUND',
    },
    SERVER: {
        // Database connection or query failed -- client should retry later
        DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
        // Unhandled error in a handler or middleware
        INTERNAL_ERROR: 'INTERNAL_ERROR',
    },
} as const;

// Flatten the nested structure to derive the union of all error code string values
type NestedValues<T> = T extends Record<string, infer V>
    ? V extends string
        ? V
        : NestedValues<V>
    : never;

type ErrorCode = NestedValues<typeof ERROR_CODES>;

interface ErrorResponse {
    code: ErrorCode;
    error: string;
}

function createErrorResponse(code: ErrorCode, message: string): ErrorResponse {
    return { code, error: message };
}

export { createErrorResponse, ERROR_CODES };
export type { ErrorCode, ErrorResponse };
