/**
 * Add composite index on posts(email, created_at DESC) for pagination queries.
 * Requires posts table to exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createIndex('posts', [{ name: 'email' }, { name: 'created_at', sort: 'DESC' }], { name: 'idx_posts_email_created' });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.dropIndex('posts', [], { name: 'idx_posts_email_created' });
};
