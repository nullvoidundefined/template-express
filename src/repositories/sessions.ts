import type { Pool } from 'pg';
import { AUTH } from '../constants/auth.js';

function createSessionsRepo(pool: Pool) {
    async function createSession(token: string, email: string) {
        await pool.query('INSERT INTO sessions (token, email) VALUES ($1, $2)', [token, email]);
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

    // Returns the email if the session is valid and within the TTL window
    async function findSession(token: string): Promise<string | undefined> {
        const result = await pool.query(
            "SELECT email FROM sessions WHERE token = $1 AND created_at > now() - $2 * INTERVAL '1 day'",
            [token, AUTH.SESSION_TTL_DAYS],
        );
        return result.rows[0]?.email;
    }

    return { createSession, deleteExpiredSessions, deleteSession, findSession };
}

export { createSessionsRepo };
export type SessionsRepo = ReturnType<typeof createSessionsRepo>;
