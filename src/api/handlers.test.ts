import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { describeDb } from '../db/testing.ts';
import { redis } from '../db/bindings/redis.ts';
import { bookEditionHandler, bookWorkHandler } from './books.ts';
import { mergeResults, searchHandler } from './search.ts';
import type { SearchResult } from '../schemas/search.ts';
import { searchPrefix } from '../config/redis.ts';
import * as searchRepo from '../db/search/repo.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';

// Read-through caching against live Redis, with OpenLibrary stubbed out.
const suffix = `${Date.now()}`;
const keys: string[] = [];
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (url: string) =>
        Response.json({ from: 'openlibrary', url: String(url), docs: [] })) as any);
});
afterEach(() => fetchSpy.mockRestore());
afterAll(async () => {
    for (const key of keys) await redis.del(key);
});

const body = async (res: Response) => {
    expect(res.headers.get('Content-Type')).toBe('application/json');
    return res.json() as Promise<Record<string, unknown>>;
};

describeDb("read-through handlers", () => {
    test.each([
        ['bookWorkHandler', bookWorkHandler, `OL${suffix}1W`, 'work'],
        ['bookEditionHandler', bookEditionHandler, `OL${suffix}2W`, 'edition'],
    ] as const)("%s fetches once on a miss, then serves from cache", async (_name, handler, query, prefix) => {
        keys.push(`${prefix}:${query}`);

        const first = await body(await handler(query));
        expect(first.from).toBe('openlibrary');
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const second = await body(await handler(query));
        expect(second).toEqual(first);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("searchHandler falls back to OpenLibrary when the catalog has too few results, then serves from cache", async () => {
        const query = `plotline-test-${suffix}`;
        keys.push(`${searchPrefix}:${query}`);
        fetchSpy.mockImplementation((async () => Response.json({
            docs: [{ key: `/works/OL${suffix}3W`, title: 'Stub', author_name: ['Someone'] }],
        })) as any);

        const first = await body(await searchHandler(query));
        expect(first.query).toBe(query);
        expect(first.results).toEqual([expect.objectContaining({ olid: `OL${suffix}3W`, source: 'openlibrary', authors: ['Someone'] })]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        expect(await body(await searchHandler(query))).toEqual(first);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("searchHandler answers from OpenLibrary when the catalog fails, without caching", async () => {
        const query = `plotline-test-down-${suffix}`;
        keys.push(`${searchPrefix}:${query}`);
        const catalogSpy = spyOn(searchRepo, 'searchCatalog').mockRejectedValue(new Error('Postgres down'));
        fetchSpy.mockImplementation((async () => Response.json({ docs: [{ key: `/works/OL${suffix}4W`, title: 'Stub' }] })) as any);
        try {
            const result = await body(await searchHandler(query));
            expect(result.results).toEqual([expect.objectContaining({ olid: `OL${suffix}4W`, source: 'openlibrary' })]);
            expect(await getSearchQuery(query)).toBeNull();
        } finally {
            catalogSpy.mockRestore();
        }
    });

    test("bookWorkHandler rejects an invalid work ID without calling OpenLibrary", async () => {
        await expect(bookWorkHandler(`not-a-work-${suffix}`)).rejects.toThrow(/Invalid work ID/);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe("mergeResults", () => {
    const result = (title: string, olid: string | null, source: SearchResult['source']): SearchResult => ({
        id: null, olid, title, subtitle: null, authors: [], firstPublishedYear: null, coverUrl: null, source,
    });

    test("keeps catalog results first and drops OpenLibrary duplicates", async () => {
        const merged = mergeResults(
            [result('Dune', 'OL893415W', 'catalog')],
            [result('Dune', 'OL893415W', 'openlibrary'), result('Dune Messiah', 'OL893502W', 'openlibrary')],
            20,
        );
        expect(merged.map(r => `${r.title}/${r.source}`)).toEqual(['Dune/catalog', 'Dune Messiah/openlibrary']);
    });

    test("stops at the limit", async () => {
        const many = Array.from({ length: 5 }, (_, i) => result(`Book ${i}`, `OL${i}W`, 'openlibrary'));
        expect(mergeResults([], many, 3)).toHaveLength(3);
    });
});
