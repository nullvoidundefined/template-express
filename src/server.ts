import express from 'express';
import cookieParser from 'cookie-parser';
import { HTTP } from './constants/http.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import postsRouter from './routes/posts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON bodies and cookies for all routes
app.use(express.json({ limit: HTTP.BODY_LIMIT }));
app.use(cookieParser());

// Mount route groups
app.use('/auth', authRouter);
app.use('/health', healthRouter);
app.use('/posts', postsRouter);

// Catch unmatched routes
app.use((_req, res) => {
    res.status(HTTP.STATUS.NOT_FOUND).json({ error: 'Not found' });
});

// Global error handler -- must be after all routes
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
