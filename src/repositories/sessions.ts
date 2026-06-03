import pool from '../db.js';
import { AUTH } from '../constants/auth.js';

async function createSession(token: string, email: string) {
    await pool.query('INSERT INTO sessions (token, email) VALUES ($1, $2)', [token, email]);
}

async function deleteExpiredSessions() {
    await pool.query("DELETE FROM sessions WHERE created_at < now() - $1 * INTERVAL '1 day'", [
        AUTH.SESSION_TTL_DAYS,
    ]);
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

export { createSession, deleteExpiredSessions, deleteSession, findSession };
