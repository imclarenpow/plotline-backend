import { describe, expect, test } from 'bun:test';
import { toDateString, toExternalIds } from './utils.ts';

describe("toDateString", () => {
    test("formats a local-midnight Date (how MySQL DATE columns arrive) as YYYY-MM-DD", async () => {
        expect(toDateString(new Date(1976, 6, 17))).toBe("1976-07-17");
    });

    test("passes date strings through, dropping any time part", async () => {
        expect(toDateString("1971-02-19")).toBe("1971-02-19");
        expect(toDateString("1971-02-19T00:00:00Z")).toBe("1971-02-19");
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
