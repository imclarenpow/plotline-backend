import { afterAll, expect, test } from 'bun:test';
import { describeDb } from '../../testing.ts';
import { redis } from '../../bindings/redis.ts';
import { searchPrefix, ttl } from '../../../config/redis.ts';
import { getEditionsSearchInfo, getSearchQuery, getWorksSearchInfo } from './lookups.ts';
import { setEditionsSearchInfo, setSearchQuery, setWorksSearchInfo } from './mutations.ts';

// Live Redis. Every key uses a unique suffix and is deleted afterwards.
const suffix = `${Date.now()}`;
const keys: string[] = [];
const track = (key: string) => (keys.push(key), key);

afterAll(async () => {
    for (const key of keys) await redis.del(key);
});

describeDb("search cache", () => {
    test("works and editions round-trip as JSON under their prefixes, with a TTL", async () => {
        const work = `OL${suffix}W`;
        track(`work:${work}`);
        track(`edition:${work}`);
        await setWorksSearchInfo(work, { title: 'Saga' });
        await setEditionsSearchInfo(work, { entries: [{ isbn_13: ['9781607066019'] }] });

        expect(await getWorksSearchInfo(work)).toEqual({ title: 'Saga' });
        expect(await getEditionsSearchInfo(work)).toEqual({ entries: [{ isbn_13: ['9781607066019'] }] });
        const remaining = await redis.ttl(`work:${work}`);
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(ttl);
    });

    test("a miss returns null", async () => {
        expect(await getWorksSearchInfo(`OL${suffix}0W`)).toBeNull();
    });

    test("a corrupted entry returns null and is deleted", async () => {
        const key = track(`work:OL${suffix}9W`);
        await redis.set(key, '{not json');
        expect(await getWorksSearchInfo(`OL${suffix}9W`)).toBeNull();
        expect(await redis.exists(key)).toBe(false);
    });

    test("setSearchQuery caches only the query, never the works in it", async () => {
        const query = `plotline-test-${suffix}`;
        const work = `OL${suffix}5W`;
        track(`${searchPrefix}:${query}`);
        track(`work:${work}`);
        await setSearchQuery(query, { query, results: [{ olid: work, title: 'From search' }] });

        expect((await getSearchQuery(query))?.results).toHaveLength(1);
        expect(await getWorksSearchInfo(work)).toBeNull();
    });
});
