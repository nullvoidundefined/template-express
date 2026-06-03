import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/demo_express',
});

export default pool;
