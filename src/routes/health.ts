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
            // Database unreachable -- report unhealthy so load balancers route traffic away
            res.status(HTTP.STATUS.INTERNAL_SERVER_ERROR).json({ status: 'error' });
        }
    });

    return router;
}

export { createHealthRouter };
