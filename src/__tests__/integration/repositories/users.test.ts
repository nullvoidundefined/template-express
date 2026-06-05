import { describe, it, expect } from 'vitest';
import { createUsersRepo } from '../../../repositories/users/users.js';
import { testPool } from '../setup.js';

describe('users repository', () => {
    const usersRepo = createUsersRepo(testPool);

    describe('insertUser', () => {
        it('inserts a user and returns true', async () => {
            const result = await usersRepo.insertUser('new@test.com', 'hash123');

            expect(result).toBe(true);
        });

        it('returns false on duplicate email', async () => {
            await usersRepo.insertUser('dupe@test.com', 'hash123');
            const result = await usersRepo.insertUser('dupe@test.com', 'hash456');

            expect(result).toBe(false);
        });
    });

    describe('findByEmail', () => {
        it('returns undefined when user does not exist', async () => {
            const user = await usersRepo.findByEmail('nobody@test.com');

            expect(user).toBeUndefined();
        });

        it('returns the user when found', async () => {
            await usersRepo.insertUser('found@test.com', 'hash123');

            const user = await usersRepo.findByEmail('found@test.com');

            expect(user).toEqual({ email: 'found@test.com', password_hash: 'hash123' });
        });
    });
});
