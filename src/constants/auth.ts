const AUTH = {
    COOKIE_NAME: 'session',
    ERRORS: {
        EMAIL_ALREADY_REGISTERED: 'Email already registered',
        EMAIL_AND_PASSWORD_REQUIRED: 'Email and password required',
        EMAIL_INVALID_FORMAT: 'Email must be a valid email address',
        EMAIL_TOO_LONG: 'Email must be 255 characters or less',
        INVALID_CREDENTIALS: 'Invalid credentials',
        PASSWORD_TOO_LONG: 'Password must be 72 characters or less',
        PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
    },
    LIMITS: {
        BCRYPT_SALT_ROUNDS: 10,
        EMAIL_MAX: 255,
        PASSWORD_MAX: 72,
        PASSWORD_MIN: 8,
    },
    // If changed, also update the pg_cron interval in 20260603-1400-schedule-session-cleanup.sql
    SESSION_TTL_DAYS: 7,
} as const;

export { AUTH };
