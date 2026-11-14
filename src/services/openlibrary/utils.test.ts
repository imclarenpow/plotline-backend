import { describe, expect, test } from 'bun:test';
import { olId, toSearchResults } from './utils.ts';

describe("olId", () => {
    test("strips the path from any OpenLibrary key", async () => {
        expect(olId("/works/OL123456W")).toBe("OL123456W");
        expect(olId("/authors/OL1A")).toBe("OL1A");
    });

    test("leaves a bare ID unchanged", async () => {
        expect(olId("OL123456W")).toBe("OL123456W");
    });
});

describe("toSearchResults", () => {
    test("maps search.json docs to search results", async () => {
        const results = toSearchResults({
            docs: [{
                key: "/works/OL893415W",
                title: "Dune",
                author_name: ["Frank Herbert"],
                first_publish_year: 1965,
                cover_i: 11481354,
            }],
        });
        expect(results).toEqual([{
            id: null,
            olid: "OL893415W",
            title: "Dune",
            subtitle: null,
            authors: ["Frank Herbert"],
            firstPublishedYear: 1965,
            coverUrl: "https://covers.openlibrary.org/b/id/11481354-M.jpg",
            source: "openlibrary",
        }]);
    });

    test("defaults missing optional fields", async () => {
        const [result] = toSearchResults({ docs: [{ key: "/works/OL1W", title: "Minimal" }] });
        expect(result).toMatchObject({ authors: [], subtitle: null, firstPublishedYear: null, coverUrl: null });
    });

    test("skips docs that don't validate", async () => {
        const results = toSearchResults({ docs: [{ key: "/books/OL1M", title: "Edition" }, { key: "/works/OL2W" }] });
        expect(results).toEqual([]);
    });

    test("returns nothing for payloads without a docs array", async () => {
        expect(toSearchResults({})).toEqual([]);
        expect(toSearchResults(null)).toEqual([]);
    });
});
