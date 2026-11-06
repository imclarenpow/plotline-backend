import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import * as ol from '../../config/openlibrary.ts';
import { getAuthor, getAuthorCover, getBookCover, getEditions, getWork, search } from './client.ts';

// fetch is stubbed: these tests never touch the network.
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;
let nextResponse: () => Response;

beforeEach(() => {
    nextResponse = () => Response.json({ ok: true });
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () => nextResponse()) as any);
});
afterEach(() => fetchSpy.mockRestore());

const calledUrl = () => String(fetchSpy.mock.calls[0]?.[0]);
const calledHeaders = () => (fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined)?.headers;

describe("ID validation happens before any request", () => {
    test.each([
        ['getWork', () => getWork('OL123A')],
        ['getWork', () => getWork('/works/OL123W')],
        ['getEditions', () => getEditions('not-an-id')],
        ['getAuthor', () => getAuthor('OL123W')],
    ])("%s rejects an invalid ID", async (_name, call) => {
        await expect(call()).rejects.toThrow(/Invalid/);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe("requests", () => {
    test("getWork fetches /works/{id}.json with the User-Agent", async () => {
        nextResponse = () => Response.json({ title: 'Dune' });
        expect(await getWork('OL893415W')).toEqual({ title: 'Dune' });
        expect(calledUrl()).toBe(`${ol.URL}/works/OL893415W.json`);
        expect(calledHeaders()).toEqual(ol.userAgent);
    });

    test("getEditions fetches up to 100 editions", async () => {
        await getEditions('OL893415W');
        expect(calledUrl()).toBe(`${ol.URL}/works/OL893415W/editions.json?limit=100`);
        expect(calledHeaders()).toEqual(ol.userAgent);
    });

    test("getAuthor fetches /authors/{id}.json", async () => {
        await getAuthor('OL2832500A');
        expect(calledUrl()).toBe(`${ol.URL}/authors/OL2832500A.json`);
    });

    test("search encodes the query, limits fields and results, and sends the User-Agent", async () => {
        await search('watchmen & co', 20);
        const url = new URL(calledUrl());
        expect(url.pathname).toBe('/search.json');
        expect(url.searchParams.get('q')).toBe('watchmen & co');
        expect(url.searchParams.get('fields')).toBe(ol.SEARCH_PARAMS);
        expect(url.searchParams.get('limit')).toBe('20');
        expect(calledHeaders()).toEqual(ol.userAgent);
    });

    test.each([
        ['getWork', () => getWork('OL1W')],
        ['getEditions', () => getEditions('OL1W')],
        ['getAuthor', () => getAuthor('OL1A')],
        ['search', () => search('x', 1)],
    ])("%s throws when OpenLibrary returns an error status", async (_name, call) => {
        nextResponse = () => new Response('down', { status: 503 });
        await expect(call()).rejects.toThrow(/Failed/);
    });
});

describe("cover URLs", () => {
    test("build OpenLibrary cover URLs with size and .jpg", async () => {
        expect(await getBookCover(12345, 'M')).toBe('https://covers.openlibrary.org/b/olid/12345-M.jpg');
        expect(await getAuthorCover('6789', 'L')).toBe('https://covers.openlibrary.org/a/id/6789-L.jpg');
    });

    test("reject sizes other than S, M and L", async () => {
        await expect(getBookCover(1, 'XL')).rejects.toThrow(/Invalid cover size/);
        await expect(getAuthorCover('1', 'm')).rejects.toThrow(/Invalid cover size/);
    });
});
