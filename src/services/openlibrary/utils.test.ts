import { afterAll, describe, expect, test } from 'bun:test';
import { describeDb } from '../../db/testing.ts';
import { redis } from '../../db/bindings/redis.ts';
import { getWorksSearchInfo } from '../../db/search/redis/lookups.ts';
import { cleanWorkOlid, processSearchResults, transformBookOLDataToDBFormat } from './utils.ts';

describe("cleanWorkOlid", () => {
    test("removes the /works/ prefix", async () => {
        expect(await cleanWorkOlid("/works/OL123456W")).toBe("OL123456W");
    });

    test("leaves a bare OLID unchanged", async () => {
        expect(await cleanWorkOlid("OL123456W")).toBe("OL123456W");
    });

    test("returns an empty string for /works/ alone", async () => {
        expect(await cleanWorkOlid("/works/")).toBe("");
    });
});

describe("transformBookOLDataToDBFormat", () => {
    test("maps OpenLibrary fields to the cached format", async () => {
        const result = await transformBookOLDataToDBFormat({
            title: "The Great Gatsby",
            description: "A classic novel",
            number_of_pages: 180,
            key: "/works/OL123456W",
            covers: [12345],
            identifiers: { isbn: "123456789" },
        });
        expect(result).toEqual({
            title: "The Great Gatsby",
            bio: "A classic novel",
            number_of_pages: 180,
            work_id: "OL123456W",
            cover_id: 12345,
            sources: { isbn: "123456789" },
        });
    });

    test("throws for missing book data", async () => {
        await expect(transformBookOLDataToDBFormat(null)).rejects.toThrow("No book data provided");
    });

    test("defaults missing optional fields", async () => {
        const result = await transformBookOLDataToDBFormat({ title: "Minimal Book", key: "/works/OL999999W" });
        expect(result.number_of_pages).toBe(0);
        expect(result.bio).toBeNull();
        expect(result.cover_id).toBeNull();
        expect(result.sources).toEqual({});
    });

    test("cleans whitespace in the title", async () => {
        const result = await transformBookOLDataToDBFormat({ title: "  Book\nWith\tWhitespace  ", key: "/works/OL1W" });
        expect(result.title).toBe("Book With Whitespace");
    });

    test("uses the first cover", async () => {
        const result = await transformBookOLDataToDBFormat({ title: "Covers", key: "/works/OL1W", covers: [111, 222, 333] });
        expect(result.cover_id).toBe(111);
    });
});

describeDb("processSearchResults", () => {
    const suffix = `${Date.now()}`;
    const fresh = `OL${suffix}1W`;
    const existing = `OL${suffix}2W`;

    afterAll(async () => {
        await redis.del(`work:${fresh}`);
        await redis.del(`work:${existing}`);
    });

    test("caches each result under work:{id}, without overwriting existing entries", async () => {
        await redis.set(`work:${existing}`, JSON.stringify({ title: 'already cached' }));
        await processSearchResults({
            docs: [
                { key: `/works/${fresh}`, title: 'Fresh' },
                { key: `/works/${existing}`, title: 'Replacement' },
            ],
        });
        expect((await getWorksSearchInfo(fresh))?.title).toBe('Fresh');
        expect((await getWorksSearchInfo(existing))?.title).toBe('already cached');
    });

    test("ignores payloads without a docs array", async () => {
        await processSearchResults({});
        await processSearchResults(null);
    });
});
