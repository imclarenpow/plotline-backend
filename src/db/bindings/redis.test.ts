import { expect, test } from 'bun:test';
import { describeDb } from '../testing.ts';
import { testConnection } from './redis.ts';

describeDb("Redis Connection", () => {
    test("should return pong response from Redis", async () => {
        const result = await testConnection();
        expect(result).toBe("PONG");
    });
});
