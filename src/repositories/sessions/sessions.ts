import type { Pool } from 'pg';
import { AUTH } from '../../constants/auth.js';

interface SessionUser {
    email: string;
    id: string;
}

function createSessionsRepo(pool: Pool) {
    async function createSession(token: string, userId: string) {
        await pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, userId]);
    }

    // Parameterized integer * INTERVAL avoids injecting raw text into SQL
    async function deleteExpiredSessions() {
        await pool.query(
            "DELETE FROM sessions WHERE created_at < now() - $1 * INTERVAL '1 day'",
            [AUTH.SESSION_TTL_DAYS],
        );
    }

    async function deleteSession(token: string) {
        await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }

    // Returns the session's user (id + email) if valid and within the TTL window
    async function findSession(token: string): Promise<SessionUser | undefined> {
        const result = await pool.query(
            `SELECT users.email, users.id FROM sessions
             JOIN users ON users.id = sessions.user_id
             WHERE sessions.token = $1
             AND sessions.created_at > now() - $2 * INTERVAL '1 day'`,
            [token, AUTH.SESSION_TTL_DAYS],
        );
        return result.rows[0];
    }

    return { createSession, deleteExpiredSessions, deleteSession, findSession };
}

export { createSessionsRepo };
export type { SessionUser };
export type SessionsRepo = ReturnType<typeof createSessionsRepo>;
