const AUTH = {
    COOKIE_NAME: 'session',
    ERRORS: {
        EMAIL_ALREADY_REGISTERED: 'Email already registered',
        INVALID_CREDENTIALS: 'Invalid credentials',
    },
    LIMITS: {
        BCRYPT_SALT_ROUNDS: 10,
    },
    // If changed, also update the pg_cron interval in 20260603-1400-schedule-session-cleanup.sql
    SESSION_TTL_DAYS: 7,
} as const;

export { AUTH };
