import type { Pool } from 'pg';

interface User {
    email: string;
    password_hash: string;
}

function createUsersRepo(pool: Pool) {
    async function findByEmail(email: string): Promise<User | undefined> {
        const result = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', [
            email,
        ]);
        return result.rows[0];
    }

    // Returns false on duplicate email instead of throwing
    async function insertUser(email: string, passwordHash: string): Promise<boolean> {
        try {
            await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [
                email,
                passwordHash,
            ]);
            return true;
        } catch (error: unknown) {
            // Unique violation (primary key conflict)
            if (error instanceof Error && 'code' in error && error.code === '23505') {
                return false;
            }
            throw error;
        }
    }

    return { findByEmail, insertUser };
}

export { createUsersRepo };
export type { User };
export type UsersRepo = ReturnType<typeof createUsersRepo>;
