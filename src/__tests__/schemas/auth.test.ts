import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../../schemas/auth.js';

describe('registerSchema', () => {
    it('accepts valid email and password', () => {
        const result = registerSchema.safeParse({
            email: 'user@test.com',
            password: 'password123',
        });
        expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
        const result = registerSchema.safeParse({ password: 'password123' });
        expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
        const result = registerSchema.safeParse({ email: 'user@test.com' });
        expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
        const result = registerSchema.safeParse({ email: 'notanemail', password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Email must be a valid email address');
        }
    });

    it('rejects email over 255 characters', () => {
        const result = registerSchema.safeParse({
            email: 'a'.repeat(250) + '@test.com',
            password: 'password123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Email must be 255 characters or less');
        }
    });

    it('rejects password under 8 characters', () => {
        const result = registerSchema.safeParse({ email: 'user@test.com', password: 'short' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
        }
    });

    it('rejects password over 72 characters', () => {
        const result = registerSchema.safeParse({
            email: 'user@test.com',
            password: 'a'.repeat(73),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Password must be 72 characters or less');
        }
    });
});

describe('loginSchema', () => {
    it('accepts valid email and password', () => {
        const result = loginSchema.safeParse({ email: 'user@test.com', password: 'password123' });
        expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
        const result = loginSchema.safeParse({ password: 'password123' });
        expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
        const result = loginSchema.safeParse({ email: 'user@test.com' });
        expect(result.success).toBe(false);
    });
});
