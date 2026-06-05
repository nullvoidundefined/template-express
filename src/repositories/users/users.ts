import type { Pool } from 'pg';

interface User {
    created_at: Date;
    email: string;
    id: string;
    password_hash: string;
    updated_at: Date;
}

function createUsersRepo(pool: Pool) {
    async function findByEmail(email: string): Promise<User | undefined> {
        const result = await pool.query(
            'SELECT created_at, email, id, password_hash, updated_at FROM users WHERE email = $1',
            [email],
        );
        return result.rows[0];
    }

    // Returns the new user's id, or null on duplicate email (unique violation)
    // instead of throwing. Callers need the id to create a session.
    async function insertUser(email: string, passwordHash: string): Promise<string | null> {
        try {
            const result = await pool.query(
                'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
                [email, passwordHash],
            );
            return result.rows[0].id;
        } catch (error: unknown) {
            // Unique violation on email
            if (error instanceof Error && 'code' in error && error.code === '23505') {
                return null;
            }
            throw error;
        }
    }

    return { findByEmail, insertUser };
}

export { createUsersRepo };
export type { User };
export type UsersRepo = ReturnType<typeof createUsersRepo>;
