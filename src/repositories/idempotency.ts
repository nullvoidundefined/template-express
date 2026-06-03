import type { Pool } from 'pg';

const IDEMPOTENCY_TTL_HOURS = 24;

interface StoredResponse {
    status_code: number;
    response_body: unknown;
}

function createIdempotencyRepo(pool: Pool) {
    // Returns the stored response if this key has been seen, undefined otherwise
    async function findByKey(key: string, email: string): Promise<StoredResponse | undefined> {
        const result = await pool.query(
            `SELECT status_code, response_body FROM idempotency_keys
             WHERE key = $1 AND email = $2
             AND created_at > now() - $3 * INTERVAL '1 hour'`,
            [key, email, IDEMPOTENCY_TTL_HOURS],
        );
        return result.rows[0];
    }

    async function store(key: string, email: string, statusCode: number, responseBody: unknown) {
        await pool.query(
            'INSERT INTO idempotency_keys (key, email, status_code, response_body) VALUES ($1, $2, $3, $4)',
            [key, email, statusCode, JSON.stringify(responseBody)],
        );
    }

    return { findByKey, store };
}

export { createIdempotencyRepo };
export type IdempotencyRepo = ReturnType<typeof createIdempotencyRepo>;
