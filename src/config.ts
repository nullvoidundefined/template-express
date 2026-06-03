import { z } from 'zod';

const configSchema = z.object({
    corsOrigin: z.string().default('http://localhost:3000'),
    databaseUrl: z.string().default('postgresql://localhost:5432/template_express'),
    isProduction: z.boolean(),
    isTest: z.boolean(),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().int().positive().default(3001),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
    const nodeEnv = process.env.NODE_ENV || 'development';

    const result = configSchema.safeParse({
        corsOrigin: process.env.CORS_ORIGIN,
        databaseUrl: process.env.DATABASE_URL,
        isProduction: nodeEnv === 'production',
        isTest: nodeEnv === 'test',
        nodeEnv,
        port: process.env.PORT,
    });

    if (!result.success) {
        console.error('Invalid configuration:', result.error.issues);
        process.exit(1);
    }

    const config = result.data;

    // Require explicit values in production -- defaults are only safe for local dev
    if (config.isProduction) {
        const missing = [];
        if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
        if (!process.env.CORS_ORIGIN) missing.push('CORS_ORIGIN');
        if (missing.length > 0) {
            console.error(`Missing required environment variables: ${missing.join(', ')}`);
            process.exit(1);
        }
    }

    return config;
}

const config = loadConfig();

export { config };
export type { Config };
