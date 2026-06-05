/**
 * Create idempotency_keys table for request deduplication.
 * Requires users table to exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('idempotency_keys', {
    key: { type: 'text', notNull: true },
    email: {
      type: 'text',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    status_code: { type: 'integer', notNull: true },
    response_body: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  }, {
    constraints: {
      primaryKey: ['key', 'email'],
    },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.dropTable('idempotency_keys');
};
