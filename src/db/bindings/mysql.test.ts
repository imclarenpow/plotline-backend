import { expect, test } from 'bun:test';
import { describeDb } from '../testing.ts';
import { testConnection } from './mysql.ts';

describeDb("MySQL Connection", () => {
    test("should return query results from MySQL", async () => {
        const result = await testConnection();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });
});
