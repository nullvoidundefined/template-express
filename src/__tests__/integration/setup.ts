import { execSync } from 'node:child_process';
import pg from 'pg';
import { beforeAll, afterAll, beforeEach } from 'vitest';

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
    // Drop and recreate test database to ensure a clean schema state.
    // This handles the transition from the old custom runner (migrations table)
    // to node-pg-migrate (pgmigrations table).
    const adminPool = new pg.Pool({ connectionString: ADMIN_URL });
    try {
        await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
        await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
    } finally {
        await adminPool.end();
    }

    // Run all migrations against the test database via node-pg-migrate
    execSync('node_modules/.bin/node-pg-migrate up', {
        env: { ...process.env, DATABASE_URL: TEST_URL },
        stdio: 'inherit',
    });
});

// Truncate all application tables between tests
beforeEach(async () => {
    await testPool.query('TRUNCATE idempotency_keys, sessions, posts, users CASCADE');
});

afterAll(async () => {
    await testPool.end();
});
