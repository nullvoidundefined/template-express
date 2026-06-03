import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/__integration__/**/*.test.ts'],
        setupFiles: ['src/__integration__/setup.ts'],
        sequence: {
            concurrent: false,
        },
        // Run test files sequentially to avoid database races
        fileParallelism: false,
    },
});
