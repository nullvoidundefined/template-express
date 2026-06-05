import type { Pool } from 'pg';

const POST_COLUMNS = 'id, user_id, title, body, created_at';

interface Post {
    body: string;
    created_at: Date;
    id: number;
    title: string;
    user_id: string;
}

function createPostsRepo(pool: Pool) {
    async function createPost(userId: string, title: string, body: string): Promise<Post> {
        const result = await pool.query(
            `INSERT INTO posts (user_id, title, body) VALUES ($1, $2, $3) RETURNING ${POST_COLUMNS}`,
            [userId, title, body],
        );
        return result.rows[0];
    }

    // Scoped to user_id to prevent users from deleting other users' posts
    async function deletePost(id: number, userId: string): Promise<boolean> {
        const result = await pool.query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [
            id,
            userId,
        ]);
        return (result.rowCount ?? 0) > 0;
    }

    async function findByUserId(
        userId: string,
        limit: number,
        offset: number,
    ): Promise<{ posts: Post[]; total: number }> {
        const [dataResult, countResult] = await Promise.all([
            pool.query(
                `SELECT ${POST_COLUMNS} FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
                [userId, limit, offset],
            ),
            pool.query('SELECT count(*)::int AS total FROM posts WHERE user_id = $1', [userId]),
        ]);
        return { posts: dataResult.rows, total: countResult.rows[0].total };
    }

    async function findById(id: number): Promise<Post | undefined> {
        const result = await pool.query(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1`, [id]);
        return result.rows[0];
    }

    // Scoped to user_id to prevent users from updating other users' posts
    async function updatePost(
        id: number,
        userId: string,
        title: string,
        body: string,
    ): Promise<Post | undefined> {
        const result = await pool.query(
            `UPDATE posts SET title = $1, body = $2 WHERE id = $3 AND user_id = $4 RETURNING ${POST_COLUMNS}`,
            [title, body, id, userId],
        );
        return result.rows[0];
    }

    return { createPost, deletePost, findById, findByUserId, updatePost };
}

export { createPostsRepo };
export type { Post };
export type PostsRepo = ReturnType<typeof createPostsRepo>;
