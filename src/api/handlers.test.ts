import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { afterAllDb, describeDb } from '../db/testing.ts';
import { pg } from '../db/bindings/postgres.ts';
import { redis } from '../db/bindings/redis.ts';
import * as works from '../db/works/repo.ts';
import * as contributors from '../db/contributors/repo.ts';
import { isbn10To13 } from '../import/isbn.ts';
import { mergeResults, searchHandler } from './search.ts';
import { resolveWorkHandler, workEditionsHandler, workHandler } from './works.ts';
import type { SearchResult } from '../schemas/search.ts';
import type { WorkDetail } from '../schemas/works.ts';
import { searchPrefix } from '../config/redis.ts';
import * as searchRepo from '../db/search/repo.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';
import { UNREACHABLE } from '../services/openlibrary/client.ts';

// Handlers against live Postgres and Redis, with OpenLibrary stubbed out.
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const keys: string[] = [];
const createdWorks: string[] = [];
const createdContributors: string[] = [];
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

// Stubbed OpenLibrary: answers by URL path, 404 for anything not listed.
let olPages: Record<string, unknown> = {};
const stubOpenLibrary = () => fetchSpy.mockImplementation((async (url: string) => {
    const page = olPages[new URL(String(url)).pathname];
    return page === undefined ? new Response('not found', { status: 404 }) : Response.json(page);
}) as any);

beforeEach(() => {
    olPages = {};
    fetchSpy = spyOn(globalThis, 'fetch');
    stubOpenLibrary();
});
afterEach(() => fetchSpy.mockRestore());
afterAllDb(async () => {
    for (const key of keys) await redis.del(key);
    for (const id of createdWorks) await works.deleteWork(id);
    for (const id of createdContributors) await contributors.deleteContributor(id);
});

const body = async (res: Response) => {
    expect(res.headers.get('Content-Type')).toBe('application/json');
    return res.json() as Promise<any>;
};
const track = (work: WorkDetail) => {
    createdWorks.push(work.id);
    createdContributors.push(...work.contributors.map(c => c.id));
    return work;
};

describeDb("searchHandler", () => {
    test("falls back to OpenLibrary when the catalog has too few results, then serves from cache", async () => {
        const query = `plotline-test-${suffix}`;
        keys.push(`${searchPrefix}:${query}`);
        olPages['/search.json'] = { docs: [{ key: `/works/OL${suffix}3W`, title: 'Stub', author_name: ['Someone'] }] };

        const first = await body(await searchHandler(query));
        expect(first.query).toBe(query);
        expect(first.results).toEqual([expect.objectContaining({
            id: null, ref: { source: 'openlibrary', id: `OL${suffix}3W` }, source: 'openlibrary', authors: ['Someone'],
        })]);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        expect(await body(await searchHandler(query))).toEqual(first);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("answers from OpenLibrary when the catalog fails, without caching", async () => {
        const query = `plotline-test-down-${suffix}`;
        keys.push(`${searchPrefix}:${query}`);
        const catalogSpy = spyOn(searchRepo, 'searchCatalog').mockRejectedValue(new Error('Postgres down'));
        const log = spyOn(console, 'error').mockImplementation(() => {});
        olPages['/search.json'] = { docs: [{ key: `/works/OL${suffix}4W`, title: 'Stub' }] };
        try {
            const result = await body(await searchHandler(query));
            expect(result.results).toEqual([expect.objectContaining({ ref: { source: 'openlibrary', id: `OL${suffix}4W` } })]);
            expect(await getSearchQuery(query)).toBeNull();
        } finally {
            catalogSpy.mockRestore();
            log.mockRestore();
        }
    });
});

describeDb("workHandler and workEditionsHandler", () => {
    test("return a catalog work with its contributors, cover and editions", async () => {
        const work = await works.createWork({ title: `Plotline work ${suffix}`, externalIds: [{ source: 'openlibrary', id: `OL${suffix}5W` }] });
        createdWorks.push(work.id);
        const person = await contributors.createContributor({ name: `Writer ${suffix}` });
        createdContributors.push(person.id);
        await works.linkContributor(work.id, person.id, 'author');
        await works.addEdition(work.id, { isbn13: isbn10To13(`${suffix}`.slice(-9) + '0'), coverUrl: 'https://covers.openlibrary.org/b/id/5-M.jpg' });

        const detail = await body(await workHandler(work.id));
        expect(detail).toMatchObject({
            id: work.id,
            title: `Plotline work ${suffix}`,
            externalIds: [{ source: 'openlibrary', id: `OL${suffix}5W` }],
            contributors: [{ id: person.id, name: `Writer ${suffix}`, role: 'author' }],
            coverUrl: 'https://covers.openlibrary.org/b/id/5-M.jpg',
        });

        const editions = await body(await workEditionsHandler(work.id));
        expect(editions.workId).toBe(work.id);
        expect(editions.editions).toHaveLength(1);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test.each([
        ['workHandler', workHandler],
        ['workEditionsHandler', workEditionsHandler],
    ] as const)("%s answers 400 for a malformed ID and 404 for an unknown one", async (_name, handler) => {
        await expect(handler('OL893415W')).rejects.toMatchObject({ status: 400 });
        await expect(handler(Bun.randomUUIDv7())).rejects.toMatchObject({ status: 404 });
    });
});

describeDb("resolveWorkHandler", () => {
    test("finds a catalog work by any source's ID without calling OpenLibrary", async () => {
        const work = await works.createWork({
            title: `Plotline resolve ${suffix}`,
            externalIds: [{ source: 'openlibrary', id: `OL${suffix}6W` }, { source: 'goodreads', id: `gr${suffix}` }],
        });
        createdWorks.push(work.id);

        expect((await body(await resolveWorkHandler('openlibrary', `OL${suffix}6W`))).id).toBe(work.id);
        expect((await body(await resolveWorkHandler('goodreads', `gr${suffix}`))).id).toBe(work.id);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("imports a work the catalog doesn't have, with its authors and editions, once", async () => {
        const olid = `OL${suffix}7W`;
        const authorId = `OL${suffix}7A`;
        olPages[`/works/${olid}.json`] = {
            key: `/works/${olid}`, title: `Imported ${suffix}`, first_publish_date: '1986',
            subjects: ['Comics & graphic novels'], authors: [{ author: { key: `/authors/${authorId}` } }],
        };
        olPages[`/authors/${authorId}.json`] = { key: `/authors/${authorId}`, name: `Imported Author ${suffix}` };
        olPages[`/works/${olid}/editions.json`] = { entries: [
            { key: `/books/OL${suffix}7M`, works: [{ key: `/works/${olid}` }], isbn_13: [isbn10To13(`${suffix}`.slice(-9, -1) + '70')],
              languages: [{ key: '/languages/eng' }], number_of_pages: 416, covers: [77] },
            { key: `/books/OL${suffix}8M`, works: [{ key: `/works/${olid}` }], isbn_13: ['not-an-isbn'] }, // dropped
        ] };

        const work = track(await body(await resolveWorkHandler('openlibrary', olid)));
        expect(work).toMatchObject({
            title: `Imported ${suffix}`,
            firstPublishedYear: 1986,
            externalIds: [{ source: 'openlibrary', id: olid }],
            contributors: [{ name: `Imported Author ${suffix}`, role: 'author' }],
            coverUrl: 'https://covers.openlibrary.org/b/id/77-M.jpg',
        });
        const editions = await works.getEditions(work.id);
        expect(editions).toEqual([expect.objectContaining({ pageCount: 416 })]);
        const [row] = await pg`SELECT edition_count FROM works WHERE id = ${work.id}`;
        expect(row.edition_count).toBe(1);
        expect((await works.getWorkSignals(work.id))[0]?.signals).toEqual({ subjects: ['Comics & graphic novels'] });

        const calls = fetchSpy.mock.calls.length;
        expect((await body(await resolveWorkHandler('openlibrary', olid))).id).toBe(work.id);
        expect(fetchSpy.mock.calls.length).toBe(calls);
    });

    test("follows a redirect and remembers the old ID", async () => {
        const [from, to] = [`OL${suffix}8W`, `OL${suffix}9W`];
        olPages[`/works/${from}.json`] = { key: `/works/${from}`, type: { key: '/type/redirect' }, location: `/works/${to}` };
        olPages[`/works/${to}.json`] = { key: `/works/${to}`, title: `Survivor ${suffix}` };

        const work = track(await body(await resolveWorkHandler('openlibrary', from)));
        expect(work.title).toBe(`Survivor ${suffix}`);
        expect(work.externalIds).toEqual(expect.arrayContaining([
            { source: 'openlibrary', id: from }, { source: 'openlibrary', id: to },
        ]));
        expect(work.contributors).toEqual([]);
    });

    test.each([
        ['a deleted work', { type: { key: '/type/delete' } }],
        ['a work OpenLibrary does not have', undefined],
    ])("answers 404 for %s", async (_name, page) => {
        const olid = `OL${suffix}0W`;
        if (page) olPages[`/works/${olid}.json`] = { key: `/works/${olid}`, ...page };
        await expect(resolveWorkHandler('openlibrary', olid)).rejects.toMatchObject({ status: 404 });
        expect(await works.getWorkByExternalId('openlibrary', olid)).toBeNull();
    });

    test("answers 404 without a request for a source that can't import works", async () => {
        await expect(resolveWorkHandler('goodreads', `missing-${suffix}`)).rejects.toMatchObject({ status: 404 });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("answers 400 for an unknown source or a malformed OpenLibrary ID", async () => {
        await expect(resolveWorkHandler('nowhere', 'x')).rejects.toMatchObject({ status: 400 });
        await expect(resolveWorkHandler('openlibrary', 'OL1A')).rejects.toMatchObject({ status: 400 });
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("answers 503 when OpenLibrary is unreachable", async () => {
        fetchSpy.mockImplementation((async () => { throw new TypeError('fetch failed'); }) as any);
        await expect(resolveWorkHandler('openlibrary', `OL${suffix}1W`)).rejects.toMatchObject({ status: 503, message: UNREACHABLE });
    });
});

describe("mergeResults", () => {
    const result = (title: string, olid: string | null, source: SearchResult['source']): SearchResult => ({
        id: null, ref: olid ? { source: 'openlibrary', id: olid } : null, title, subtitle: null, authors: [],
        firstPublishedYear: null, coverUrl: null, source,
    });

    test("keeps catalog results first and drops OpenLibrary duplicates", async () => {
        const merged = mergeResults(
            [result('Dune', 'OL893415W', 'catalog')],
            [result('Dune', 'OL893415W', 'openlibrary'), result('Dune Messiah', 'OL893502W', 'openlibrary')],
            20,
        );
        expect(merged.map(r => `${r.title}/${r.source}`)).toEqual(['Dune/catalog', 'Dune Messiah/openlibrary']);
    });

    test("keeps results without a ref", async () => {
        const merged = mergeResults([result('A', null, 'catalog')], [result('B', null, 'openlibrary')], 20);
        expect(merged).toHaveLength(2);
    });

    test("stops at the limit", async () => {
        const many = Array.from({ length: 5 }, (_, i) => result(`Book ${i}`, `OL${i}W`, 'openlibrary'));
        expect(mergeResults([], many, 3)).toHaveLength(3);
    });
});
