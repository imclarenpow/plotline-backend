import { describe, expect, test } from 'bun:test';
import { DateSchema, UUIDSchema } from './common.ts';
import { ContributorSchema, NewContributorSchema } from './contributors.ts';
import { AuthorOlidSchema, CoverSizeSchema, WorkOlidResponseSchema, WorkOlidSchema } from './openlibrary.ts';
import { ExternalIdSchema, SourceNameSchema } from './sources.ts';
import { EditionSchema, NewEditionSchema, NewWorkSchema, WorkSchema } from './works.ts';
import { XpInputSchema } from './xp.ts';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
    expect(schema.safeParse(value).success).toBe(true);
const bad = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
    expect(schema.safeParse(value).success).toBe(false);

describe("OpenLibrary IDs", () => {
    test("work IDs are OL{digits}W", async () => {
        ok(WorkOlidSchema, 'OL893415W');
        bad(WorkOlidSchema, 'OL893415A');
        bad(WorkOlidSchema, '/works/OL893415W');
        bad(WorkOlidSchema, 'OLW');
    });

    test("work IDs in API responses may carry the /works/ prefix", async () => {
        ok(WorkOlidResponseSchema, '/works/OL893415W');
        ok(WorkOlidResponseSchema, 'OL893415W');
    });

    test("author IDs are OL{digits}A", async () => {
        ok(AuthorOlidSchema, 'OL2832500A');
        bad(AuthorOlidSchema, 'OL2832500W');
    });

    test("cover sizes are S, M or L", async () => {
        for (const size of ['S', 'M', 'L']) ok(CoverSizeSchema, size);
        bad(CoverSizeSchema, 'XL');
    });
});

describe("works and editions", () => {
    const work = { id: Bun.randomUUIDv7(), title: 'Saga, Volume One' };

    test("a work needs only an id and title; optional fields accept null", async () => {
        ok(WorkSchema, work);
        ok(WorkSchema, { ...work, subtitle: null, pageCount: null, xp: null, format: null });
    });

    test("page counts must be positive, so unknown is null, never 0", async () => {
        bad(WorkSchema, { ...work, pageCount: 0 });
        bad(WorkSchema, { ...work, pageCount: 70000 }); // SMALLINT UNSIGNED limit
        ok(WorkSchema, { ...work, pageCount: 160 });
    });

    test("titles must be non-empty and fit VARCHAR(255)", async () => {
        bad(WorkSchema, { ...work, title: '' });
        bad(WorkSchema, { ...work, title: 'x'.repeat(256) });
    });

    test("new works can't set xp or an id", async () => {
        const parsed = NewWorkSchema.parse({ title: 'New', xp: 999, id: 'x' } as any);
        expect(parsed).toEqual({ title: 'New' });
    });

    test("ISBNs: 13 digits, or 10 with an optional X check digit", async () => {
        const edition = { id: Bun.randomUUIDv7(), workId: Bun.randomUUIDv7() };
        ok(EditionSchema, { ...edition, isbn13: '9781607066019', isbn10: '160706601X' });
        bad(EditionSchema, { ...edition, isbn13: '978-1607066019' });
        bad(EditionSchema, { ...edition, isbn10: '16070660XX' });
    });

    test("editions: language is a 3-letter code and cover must be a URL", async () => {
        ok(NewEditionSchema, { language: 'eng', coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg' });
        bad(NewEditionSchema, { language: 'en' });
        bad(NewEditionSchema, { coverUrl: 'not a url' });
    });
});

describe("contributors", () => {
    test("dates must be YYYY-MM-DD", async () => {
        ok(NewContributorSchema, { name: 'Jeff Kinney', birthDate: '1971-02-19' });
        bad(NewContributorSchema, { name: 'Jeff Kinney', birthDate: '19/02/1971' });
    });

    test("names are required", async () => {
        bad(ContributorSchema, { id: Bun.randomUUIDv7(), name: '' });
    });
});

describe("sources", () => {
    test("external IDs need a known source and a non-empty id", async () => {
        ok(ExternalIdSchema, { source: 'wikidata', id: 'Q190192' });
        bad(ExternalIdSchema, { source: 'comicvine', id: '1' });
        bad(ExternalIdSchema, { source: 'wikidata', id: '' });
    });

    test("data providers are listed", async () => {
        for (const name of ['openlibrary', 'wikidata', 'gcd', 'google_books', 'community']) {
            ok(SourceNameSchema, name);
        }
    });
});

describe("XP input", () => {
    test("subjects default to an empty list", async () => {
        expect(XpInputSchema.parse({ pageCount: 100 }).subjects).toEqual([]);
    });

    test("ratings must average 1-5", async () => {
        bad(XpInputSchema, { communityRating: { average: 6, count: 1 } });
        ok(XpInputSchema, { communityRating: { average: 4.5, count: 12 } });
    });
});

describe("common", () => {
    test("UUIDs and dates", async () => {
        ok(UUIDSchema, Bun.randomUUIDv7());
        bad(UUIDSchema, 'not-a-uuid');
        ok(DateSchema, '2026-11-06');
        bad(DateSchema, '2026-11-6');
    });
});
