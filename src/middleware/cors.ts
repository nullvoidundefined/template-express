import cors from 'cors';

// Parse allowed origins from CORS_ORIGIN env var (comma-separated)
function createCorsMiddleware() {
    const raw = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const origin = raw.includes(',') ? raw.split(',').map((s) => s.trim()) : raw;

    return cors({
        // credentials: true allows the browser to send cookies on cross-origin requests
        credentials: true,
        origin,
    });
}

export { createCorsMiddleware };
