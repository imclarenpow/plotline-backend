import { expect, test, describe } from 'bun:test';
import { testConnection } from './mysql.ts';

describe("MySQL Connection", () => {
    test("should return query results from MySQL", async () => {
        const result = await testConnection();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });
});
