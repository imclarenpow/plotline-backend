import { expect, test, describe } from "bun:test";
import { testConnection } from "./redis.ts";

describe("Redis Connection", () => {
    test("should return pong response from Redis", async () => {
        const result = await testConnection();
        expect(result).toBe("PONG");
    });

    test("should handle connection errors gracefully", async () => {
        const result = await testConnection();
        expect(result).toBeDefined();
    });
});
