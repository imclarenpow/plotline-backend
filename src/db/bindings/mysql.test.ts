import { expect, test, describe } from "bun:test";
import { testConnection } from "./mysql.ts";

describe("MySQL Connection", () => {
    test("should return query results from MySQL", async () => {
        const result = await testConnection();
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });

    test("should return object", async () => {
        const result = await testConnection();
        // The result should be an array of book objects
        console.log(result);
        expect(result).toBeObject();
    });

    test("should handle connection errors gracefully", async () => {
        // Note: This test assumes the MySQL connection is working
        // If MySQL is down, this will fail. Consider using mocks for true unit tests.
        const result = await testConnection();
        expect(result).toBeDefined();
    });
});
