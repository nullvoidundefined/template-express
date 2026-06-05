import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/__tests__/integration/**/*.test.ts'],
        setupFiles: ['src/__tests__/integration/setup.ts'],
        sequence: {
            concurrent: false,
        },
        // Run test files sequentially to avoid database races
        fileParallelism: false,
    },
});
