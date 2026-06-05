/**
 * Add composite index on posts(user_id, created_at DESC) for pagination queries.
 * Requires posts table to exist.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createIndex('posts', [{ name: 'user_id' }, { name: 'created_at', sort: 'DESC' }], { name: 'idx_posts_user_id_created' });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  pgm.dropIndex('posts', [], { name: 'idx_posts_user_id_created' });
};
