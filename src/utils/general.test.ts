import { expect, test, describe } from 'bun:test';
import { cleanString } from './general.ts';

describe("cleanString", () => {
    test("should remove leading and trailing whitespace", async () => {
        const result = await cleanString("  hello world  ");
        expect(result).toBe("hello world");
    });

    test("should return empty string for whitespace-only input", async () => {
        const result = await cleanString("   \t\n\r   ");
        expect(result).toBe("");
    });

    test("should return null for non-string input", async () => {
        const result = await cleanString(123 as any);
        expect(result).toBeNull();
    });

    test("should handle normal strings without modification", async () => {
        const result = await cleanString("normal string");
        expect(result).toBe("normal string");
    });

    test("should preserve internal spaces", async () => {
        const result = await cleanString("hello   world");
        expect(result).toBe("hello   world");
    });
});
