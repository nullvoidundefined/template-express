import pg from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/demo_express',
    // Neon and Railway require SSL; local dev does not
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Keep connection count low for managed Postgres free tiers
    max: isProduction ? 5 : 10,
});

export default pool;
