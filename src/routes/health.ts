import type { Pool } from 'pg';
import { Router } from 'express';
import { HTTP } from '../constants/http.js';

function createHealthRouter(pool: Pool) {
    const router = Router();

    router.get('/', async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            res.json({ status: 'ok' });
        } catch {
            // 500 (not 503) intentionally -- load balancers treat any 5xx as unhealthy,
            // and health probes expect a simple pass/fail, not a retry-later signal
            res.status(HTTP.STATUS.INTERNAL_SERVER_ERROR).json({ status: 'error' });
        }
    });

    return router;
}

export { createHealthRouter };
