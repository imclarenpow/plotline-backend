import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { describeDb } from '../db/testing.ts';
import { redis } from '../db/bindings/redis.ts';
import { bookEditionHandler, bookWorkHandler } from './books.ts';
import { searchHandler } from './search.ts';

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
        ['searchHandler', searchHandler, `plotline-test-${suffix}`, 'search'],
    ] as const)("%s fetches once on a miss, then serves from cache", async (_name, handler, query, prefix) => {
        keys.push(`${prefix}:${query}`);

        const first = await body(await handler(query));
        expect(first.from).toBe('openlibrary');
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const second = await body(await handler(query));
        expect(second).toEqual(first);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("bookWorkHandler rejects an invalid work ID without calling OpenLibrary", async () => {
        await expect(bookWorkHandler(`not-a-work-${suffix}`)).rejects.toThrow(/Invalid work ID/);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
