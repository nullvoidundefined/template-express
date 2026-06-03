const POST = {
    ERRORS: {
        BODY_TOO_LONG: 'Body must be 10,000 characters or less',
        NOT_FOUND: 'Post not found',
        TITLE_AND_BODY_REQUIRED: 'Title and body required',
        TITLE_TOO_LONG: 'Title must be 255 characters or less',
    },
    LIMITS: {
        BODY_MAX: 10_000,
        TITLE_MAX: 255,
    },
} as const;

export { POST };
