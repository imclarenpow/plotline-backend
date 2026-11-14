import { describe, expect, test } from 'bun:test';
import { assertDateString, newUuid, toDateString, toExternalIds } from './utils.ts';

describe("assertDateString", () => {
    test("accepts valid dates, including 29 February", async () => {
        expect<string>(assertDateString("2024-02-29")).toBe("2024-02-29");
        expect<string>(assertDateString("1971-12-31")).toBe("1971-12-31");
    });

    test.each([
        ["19-02-1971", /format/],
        ["1971-13-01", /month/],
        ["1971-00-10", /month/],
        ["1971-01-32", /day/],
        ["1971-04-31", /day for month/],
        ["1971-02-30", /February/],
    ])("rejects %s", async (date, message) => {
        expect(() => assertDateString(date)).toThrow(message);
    });
});

describe("newUuid", () => {
    test("produces time-ordered v7 UUIDs", async () => {
        const a = newUuid();
        const b = newUuid();
        expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(a < b).toBe(true);
    });
});

describe("toDateString", () => {
    test("formats a Date by its local date parts as YYYY-MM-DD", async () => {
        expect<string | null>(toDateString(new Date(1976, 6, 17))).toBe("1976-07-17");
    });

    test("passes date strings through, dropping any time part", async () => {
        expect<string | null>(toDateString("1971-02-19")).toBe("1971-02-19");
        expect<string | null>(toDateString("1971-02-19T00:00:00Z")).toBe("1971-02-19");
    });

    test("returns null for missing dates", async () => {
        expect(toDateString(null)).toBeNull();
        expect(toDateString(undefined)).toBeNull();
    });
});

describe("toExternalIds", () => {
    test("strips query-result metadata down to plain { source, id } objects", async () => {
        const rows = Object.assign([{ source: "wikidata", id: "Q1" }], { count: 1, command: "SELECT" });
        const ids = toExternalIds(rows);
        expect(ids).toEqual([{ source: "wikidata", id: "Q1" }]);
        expect(Object.keys(ids)).toEqual(["0"]);
    });
});
