/**
 * Create users table.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('users', {
    email: { type: 'text', primaryKey: true },
    password_hash: { type: 'text', notNull: true },
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.dropTable('users');
};
