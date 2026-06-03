import type { Pool } from 'pg';

interface Post {
    id: number;
    email: string;
    title: string;
    body: string;
    created_at: Date;
}

function createPostsRepo(pool: Pool) {
    async function createPost(email: string, title: string, body: string): Promise<Post> {
        const result = await pool.query(
            'INSERT INTO posts (email, title, body) VALUES ($1, $2, $3) RETURNING *',
            [email, title, body],
        );
        return result.rows[0];
    }

    // Scoped to email to prevent users from deleting other users' posts
    async function deletePost(id: number, email: string): Promise<boolean> {
        const result = await pool.query('DELETE FROM posts WHERE id = $1 AND email = $2', [
            id,
            email,
        ]);
        return (result.rowCount ?? 0) > 0;
    }

    async function findByEmail(email: string): Promise<Post[]> {
        const result = await pool.query(
            'SELECT * FROM posts WHERE email = $1 ORDER BY created_at DESC',
            [email],
        );
        return result.rows;
    }

    async function findById(id: number): Promise<Post | undefined> {
        const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
        return result.rows[0];
    }

    return { createPost, deletePost, findByEmail, findById };
}

export { createPostsRepo };
export type { Post };
export type PostsRepo = ReturnType<typeof createPostsRepo>;
