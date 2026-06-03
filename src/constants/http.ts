const HTTP = {
    BODY_LIMIT: '100kb',
    DEFAULT_PORT: 3001,
    GRACEFUL_SHUTDOWN_TIMEOUT_MS: 10_000,
    RATE_LIMIT: {
        AUTH_MAX: 10,
        AUTH_WINDOW_MS: 15 * 60 * 1000,
        GENERAL_MAX: 100,
        GENERAL_WINDOW_MS: 15 * 60 * 1000,
    },
    STATUS: {
        BAD_REQUEST: 400,
        CONFLICT: 409,
        CREATED: 201,
        INTERNAL_SERVER_ERROR: 500,
        NOT_FOUND: 404,
        TOO_MANY_REQUESTS: 429,
        UNAUTHORIZED: 401,
    },
} as const;

export { HTTP };
