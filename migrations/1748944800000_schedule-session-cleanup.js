/**
 * Schedule hourly cleanup of expired sessions via pg_cron.
 * Silently skips if pg_cron is not available (e.g., local development).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        -- Delete any existing job with this name to make the migration idempotent
        PERFORM cron.unschedule('cleanup-expired-sessions');

        -- Run every hour at :00, delete sessions older than 7 days
        PERFORM cron.schedule(
            'cleanup-expired-sessions',
            '0 * * * *',
            $sql$DELETE FROM sessions WHERE created_at < now() - INTERVAL '7 days'$sql$
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'pg_cron not available -- skipping session cleanup schedule';
    END
    $$;
  `);
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
        PERFORM cron.unschedule('cleanup-expired-sessions');
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'pg_cron not available -- skipping unschedule';
    END
    $$;
  `);
};
