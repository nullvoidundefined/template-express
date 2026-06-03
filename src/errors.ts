// Machine-readable error codes -- clients switch on these, not on human-readable messages.
// Nested by domain for code-side readability; string values include the full domain path.
const ERROR_CODES = {
    AUTH: {
        // Duplicate email on registration
        EMAIL_ALREADY_REGISTERED: 'AUTH_EMAIL_ALREADY_REGISTERED',
        // Wrong email or password on login
        INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
        // No session cookie present
        REQUIRED: 'AUTH_REQUIRED',
        // Session token not found in DB or expired past TTL
        SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    },
    INPUT: {
        // Zod schema validation failed on request body, params, or query
        VALIDATION_ERROR: 'INPUT_VALIDATION_ERROR',
    },
    POSTS: {
        // Post doesn't exist or belongs to another user
        NOT_FOUND: 'POSTS_NOT_FOUND',
    },
    RATE_LIMIT: {
        // Too many requests in the current window
        EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    },
    ROUTING: {
        // No route matched the request URL
        NOT_FOUND: 'ROUTING_NOT_FOUND',
    },
    SERVER: {
        // Database connection or query failed -- client should retry later
        DATABASE_UNAVAILABLE: 'SERVER_DATABASE_UNAVAILABLE',
        // Unhandled error in a handler or middleware
        INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
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
