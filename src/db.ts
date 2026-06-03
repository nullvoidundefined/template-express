import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    // Neon and Railway require SSL; local dev does not
    ssl: config.isProduction ? { rejectUnauthorized: false } : false,
    // Keep connection count low for managed Postgres free tiers
    max: config.isProduction ? 5 : 10,
});

export default pool;
