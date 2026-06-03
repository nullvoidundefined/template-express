// Machine-readable error codes -- clients switch on these, not on human-readable messages
const ERROR_CODES = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    EMAIL_ALREADY_REGISTERED: 'EMAIL_ALREADY_REGISTERED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    NOT_FOUND: 'NOT_FOUND',
    POST_NOT_FOUND: 'POST_NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
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
