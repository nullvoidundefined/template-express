import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
    try {
        // Create a tracking table to record which migrations have run
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        `);

        // Read all .sql files from the migrations directory, sorted by name
        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        // Load all applied names into a Set for O(1) lookup per file
        const applied = await pool.query('SELECT name FROM migrations');
        const appliedSet = new Set(applied.rows.map((r) => r.name));

        // Run each unapplied migration inside a transaction
        for (const file of files) {
            if (appliedSet.has(file)) {
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

            await pool.query('BEGIN');
            try {
                await pool.query(sql);
                await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                await pool.query('COMMIT');
                console.log(`Applied: ${file}`);
            } catch (error) {
                await pool.query('ROLLBACK');
                console.error(`Failed: ${file}`, error);
                // Exit immediately so subsequent migrations don't run on a broken schema
                process.exit(1);
            }
        }

        console.log('Migrations complete');
    } catch (error) {
        console.error('Migration runner failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
