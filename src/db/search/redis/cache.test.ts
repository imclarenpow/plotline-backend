import { expect, test } from 'bun:test';
import { afterAllDb, describeDb } from '../../testing.ts';
import { redis } from '../../bindings/redis.ts';
import { searchPrefix, ttl } from '../../../config/redis.ts';
import { getSearchQuery } from './lookups.ts';
import { setSearchQuery } from './mutations.ts';

// Live Redis. Every key uses a unique suffix and is deleted afterwards.
const suffix = `${Date.now()}`;
const keys: string[] = [];
const track = (key: string) => (keys.push(key), key);

afterAllDb(async () => {
    for (const key of keys) await redis.del(key);
});

describeDb("search cache", () => {
    test("a search response round-trips as JSON under the search prefix, with a TTL", async () => {
        const query = `plotline-test-${suffix}`;
        const key = track(`${searchPrefix}:${query}`);
        const payload = { query, results: [{ id: null, ref: { source: 'openlibrary', id: `OL${suffix}W` }, title: 'Saga' }] };
        await setSearchQuery(query, payload);

        expect(await getSearchQuery(query)).toEqual(payload);
        const remaining = await redis.ttl(key);
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(ttl);
    });

    test("a miss returns null", async () => {
        expect(await getSearchQuery(`plotline-test-miss-${suffix}`)).toBeNull();
    });

    test("a corrupted entry returns null and is deleted", async () => {
        const query = `plotline-test-corrupt-${suffix}`;
        const key = track(`${searchPrefix}:${query}`);
        await redis.set(key, '{not json');
        expect(await getSearchQuery(query)).toBeNull();
        expect(await redis.exists(key)).toBe(false);
    });
});
