import { z } from 'zod';

const createPostSchema = z.object({
    body: z
        .string({ error: 'Title and body required' })
        .min(1, 'Title and body required')
        .max(10_000, 'Body must be 10,000 characters or less'),
    title: z
        .string({ error: 'Title and body required' })
        .min(1, 'Title and body required')
        .max(255, 'Title must be 255 characters or less'),
});

// Same constraints as create -- reuse the schema
const updatePostSchema = createPostSchema;

const postIdSchema = z.object({
    id: z
        .string()
        .transform((val) => Number(val))
        .refine((val) => Number.isInteger(val) && val > 0, 'Post ID must be a positive integer'),
});

const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

type CreatePostInput = z.infer<typeof createPostSchema>;
type PostIdInput = z.infer<typeof postIdSchema>;
type PaginationInput = z.infer<typeof paginationSchema>;

export { createPostSchema, paginationSchema, postIdSchema, updatePostSchema };
export type { CreatePostInput, PaginationInput, PostIdInput };
