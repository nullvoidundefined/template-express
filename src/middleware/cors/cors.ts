import cors from 'cors';
import { config } from '../../config.js';

// Parse allowed origins from config (comma-separated for multiple origins)
function createCorsMiddleware() {
    const raw = config.corsOrigin;
    const origin = raw.includes(',') ? raw.split(',').map((s) => s.trim()) : raw;

    return cors({
        // credentials: true allows the browser to send cookies on cross-origin requests
        credentials: true,
        origin,
    });
}

export { createCorsMiddleware };
