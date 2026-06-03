import type { Request, Response } from 'express';

function createMockReq(overrides: Partial<Request> = {}): Request {
    return {
        body: {},
        cookies: {},
        params: {},
        ...overrides,
    } as Request;
}

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
