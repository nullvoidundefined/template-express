import { z } from 'zod';

const registerSchema = z.object({
    email: z
        .string({ error: 'Email and password required' })
        .email('Email must be a valid email address')
        .max(255, 'Email must be 255 characters or less'),
    password: z
        .string({ error: 'Email and password required' })
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be 72 characters or less'),
});

const loginSchema = z.object({
    email: z.string({ error: 'Email and password required' }),
    password: z.string({ error: 'Email and password required' }),
});

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export { loginSchema, registerSchema };
export type { LoginInput, RegisterInput };
