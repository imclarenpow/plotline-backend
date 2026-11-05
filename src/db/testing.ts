import { describe } from 'bun:test';

// DB tests need live MySQL/Redis, so they only run under `bun run test:db` (RUN_DB_TESTS=1).
// Anywhere else they are skipped rather than failing the suite.
export const describeDb = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
