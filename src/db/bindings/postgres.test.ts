import { expect, test } from 'bun:test';
import { describeDb } from '../testing.ts';
import { testConnection } from './postgres.ts';

describeDb("Postgres connection", () => {
    test("returns query results", async () => {
        const result = await testConnection();
        expect([...result]).toEqual([{ ok: 1 }]);
    });
});
