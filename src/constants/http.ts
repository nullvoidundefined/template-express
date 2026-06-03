const HTTP = {
    BODY_LIMIT: '100kb',
    STATUS: {
        BAD_REQUEST: 400,
        CONFLICT: 409,
        CREATED: 201,
        INTERNAL_SERVER_ERROR: 500,
        NOT_FOUND: 404,
        UNAUTHORIZED: 401,
    },
} as const;

export { HTTP };
