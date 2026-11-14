import { afterAll, describe } from 'bun:test';

// DB tests need live Postgres/Redis, so they only run under `bun run test:db` (RUN_DB_TESTS=1).
// Anywhere else they are skipped rather than failing the suite.
const runDbTests = process.env.RUN_DB_TESTS === '1';
export const describeDb = runDbTests ? describe : describe.skip;

// Cleanup for DB tests: a no-op when they're skipped, so cleanup never connects under test:git.
export function afterAllDb(fn: () => Promise<unknown>): void {
    if (runDbTests) afterAll(fn);
}
