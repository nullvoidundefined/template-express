import type { Request, Response } from 'express';

// Accepts any shape for params/query since Zod middleware coerces types before handlers run
function createMockReq(overrides: Record<string, unknown> = {}): Request {
    return {
        body: {},
        cookies: {},
        params: {},
        query: {},
        ...overrides,
    } as unknown as Request;
}

// Chainable mock that records status, json, cookies, and cleared cookies for assertions
function createMockRes(): Response & {
    _status: number;
    _json: unknown;
    _cookies: Record<string, unknown>;
    _clearedCookies: string[];
} {
    const res = {
        _status: 200,
        _json: undefined as unknown,
        _cookies: {} as Record<string, unknown>,
        _clearedCookies: [] as string[],
    };

    const chainable = {
        ...res,
        status(code: number) {
            chainable._status = code;
            return chainable;
        },
        json(data: unknown) {
            chainable._json = data;
            return chainable;
        },
        cookie(name: string, value: unknown) {
            chainable._cookies[name] = value;
            return chainable;
        },
        clearCookie(name: string) {
            chainable._clearedCookies.push(name);
            return chainable;
        },
    };

    return chainable as unknown as Response & typeof res;
}

export { createMockReq, createMockRes };
