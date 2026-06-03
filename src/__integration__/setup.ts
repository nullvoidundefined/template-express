import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { beforeAll, afterAll, beforeEach } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const TEST_DB = 'template_express_test';

// In CI, DATABASE_URL points at the service container (with credentials).
// Locally, default to passwordless localhost.
const baseUrl = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL)
    : new URL('postgresql://localhost:5432/postgres');
const TEST_URL = (() => {
    const u = new URL(baseUrl.toString());
    u.pathname = `/${TEST_DB}`;
    return u.toString();
})();
const ADMIN_URL = (() => {
    const u = new URL(baseUrl.toString());
    u.pathname = '/postgres';
    return u.toString();
})();

// Shared test pool -- imported by test files
export const testPool = new pg.Pool({ connectionString: TEST_URL });

beforeAll(async () => {
    // Create test database if it doesn't exist
    const adminPool = new pg.Pool({ connectionString: ADMIN_URL });
    try {
        const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
            TEST_DB,
        ]);
        if (exists.rows.length === 0) {
            await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
        }
    } finally {
        await adminPool.end();
    }

    // Run migrations against the test database (same logic as migrate.ts)
    await testPool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);

    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    const applied = await testPool.query('SELECT name FROM migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.name));

    for (const file of files) {
        if (appliedSet.has(file)) continue;
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
        // Acquire a dedicated client so the transaction runs on a single connection
        const client = await testPool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
});

// Truncate all application tables between tests
beforeEach(async () => {
    await testPool.query('TRUNCATE idempotency_keys, sessions, posts, users CASCADE');
});

afterAll(async () => {
    await testPool.end();
});
