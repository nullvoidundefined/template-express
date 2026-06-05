import type { Pool } from 'pg';

const IDEMPOTENCY_TTL_HOURS = 24;

interface StoredResponse {
    response_body: unknown;
    status_code: number;
}

function createIdempotencyRepo(pool: Pool) {
    // Returns the stored response if this key has been seen within the TTL window
    // Parameterized integer * INTERVAL avoids injecting raw text into SQL
    async function findByKey(key: string, userId: string): Promise<StoredResponse | undefined> {
        const result = await pool.query(
            `SELECT status_code, response_body FROM idempotency_keys
             WHERE key = $1 AND user_id = $2
             AND created_at > now() - $3 * INTERVAL '1 hour'`,
            [key, userId, IDEMPOTENCY_TTL_HOURS],
        );
        return result.rows[0];
    }

    async function store(key: string, userId: string, statusCode: number, responseBody: unknown) {
        await pool.query(
            'INSERT INTO idempotency_keys (key, user_id, status_code, response_body) VALUES ($1, $2, $3, $4)',
            [key, userId, statusCode, JSON.stringify(responseBody)],
        );
    }

    return { findByKey, store };
}

export { createIdempotencyRepo };
export type IdempotencyRepo = ReturnType<typeof createIdempotencyRepo>;
