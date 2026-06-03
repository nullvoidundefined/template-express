import { describe, it, expect } from 'vitest';
import { createPostSchema, paginationSchema, postIdSchema } from '../../schemas/posts.js';

describe('createPostSchema', () => {
    it('accepts valid title and body', () => {
        const result = createPostSchema.safeParse({ title: 'Hello', body: 'World' });
        expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
        const result = createPostSchema.safeParse({ body: 'content' });
        expect(result.success).toBe(false);
    });

    it('rejects missing body', () => {
        const result = createPostSchema.safeParse({ title: 'Title' });
        expect(result.success).toBe(false);
    });

    it('rejects empty title', () => {
        const result = createPostSchema.safeParse({ title: '', body: 'content' });
        expect(result.success).toBe(false);
    });

    it('rejects title over 255 characters', () => {
        const result = createPostSchema.safeParse({ title: 'a'.repeat(256), body: 'content' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Title must be 255 characters or less');
        }
    });

    it('rejects body over 10,000 characters', () => {
        const result = createPostSchema.safeParse({ title: 'Title', body: 'a'.repeat(10_001) });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Body must be 10,000 characters or less');
        }
    });
});

describe('postIdSchema', () => {
    it('accepts a positive integer', () => {
        const result = postIdSchema.safeParse({ id: '5' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe(5);
        }
    });

    it('rejects non-numeric id', () => {
        const result = postIdSchema.safeParse({ id: 'abc' });
        expect(result.success).toBe(false);
    });

    it('rejects zero', () => {
        const result = postIdSchema.safeParse({ id: '0' });
        expect(result.success).toBe(false);
    });

    it('rejects negative numbers', () => {
        const result = postIdSchema.safeParse({ id: '-1' });
        expect(result.success).toBe(false);
    });
});

describe('paginationSchema', () => {
    it('applies defaults when no values provided', () => {
        const result = paginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(20);
            expect(result.data.offset).toBe(0);
        }
    });

    it('accepts valid limit and offset', () => {
        const result = paginationSchema.safeParse({ limit: '10', offset: '5' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.limit).toBe(10);
            expect(result.data.offset).toBe(5);
        }
    });

    it('clamps limit to max of 100', () => {
        const result = paginationSchema.safeParse({ limit: '200' });
        expect(result.success).toBe(false);
    });

    it('rejects negative offset', () => {
        const result = paginationSchema.safeParse({ offset: '-1' });
        expect(result.success).toBe(false);
    });
});
