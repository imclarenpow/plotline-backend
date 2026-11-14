import { describe, expect, test } from 'bun:test';
import {
    mightBeWantedEdition, olNumber, parseAuthor, parseDumpLine, parseEdition, parseFullDate,
    parseWork, parseYear, workAuthorKeys, type EditionFilter,
} from './parse.ts';

const english: EditionFilter = { languages: ['eng'], includeNoLanguage: false };

// A dump line: type, key, revision, last_modified, JSON.
const line = (type: string, record: Record<string, unknown>) =>
    [type, record.key, 3, '2024-01-01T00:00:00', JSON.stringify(record)].join('\t');

const dune = {
    key: '/books/OL26242482M',
    works: [{ key: '/works/OL893415W' }],
    isbn_13: ['978-0-441-01359-3'],
    isbn_10: ['0441013597'],
    languages: [{ key: '/languages/eng' }],
    number_of_pages: 612,
    publish_date: 'August 2, 2005',
    publishers: ['Ace Books'],
    covers: [-1, 11481354],
    identifiers: { goodreads: ['234225'], librarything: ['1066'], unknown_site: ['x'] },
};

describe("dump lines", () => {
    test("parseDumpLine splits the five columns", async () => {
        const parsed = parseDumpLine(line('/type/edition', dune));
        expect(parsed?.type).toBe('/type/edition');
        expect(parsed?.key).toBe('/books/OL26242482M');
        expect(JSON.parse(parsed!.json()).number_of_pages).toBe(612);
    });

    test("parseDumpLine rejects short lines", async () => {
        expect(parseDumpLine('/type/edition\t/books/OL1M')).toBeNull();
    });

    test("olNumber extracts the number only for the expected record type", async () => {
        expect(olNumber('/works/OL893415W', 'W')).toBe(893415);
        expect(olNumber('OL26320A', 'A')).toBe(26320);
        expect(olNumber('/works/OL893415W', 'A')).toBeNull();
        expect(olNumber('/works/nonsense', 'W')).toBeNull();
    });
});

describe("dates", () => {
    test("parseYear finds a plausible year in free text", async () => {
        expect(parseYear('August 2, 2005')).toBe(2005);
        expect(parseYear('c1965')).toBeNull(); // no word boundary: too ambiguous
        expect(parseYear('1965?')).toBe(1965);
        expect(parseYear('n.d.')).toBeNull();
        expect(parseYear('9999')).toBeNull();
    });

    test("parseFullDate only accepts complete dates", async () => {
        expect(parseFullDate('1920-01-02')).toBe('1920-01-02');
        expect(parseFullDate('8 October 1920')).toBe('1920-10-08');
        expect(parseFullDate('October 8, 1920')).toBe('1920-10-08');
        expect(parseFullDate('1920')).toBeNull();
        expect(parseFullDate('February 30, 1920')).toBeNull();
        expect(parseFullDate('Smarch 3, 1920')).toBeNull();
    });
});

describe("parseEdition", () => {
    test("maps an English edition with ISBNs", async () => {
        expect(mightBeWantedEdition(JSON.stringify(dune), english)).toBe(true);
        expect(parseEdition(JSON.stringify(dune), english)).toEqual({
            externalId: 'OL26242482M',
            workExternalId: 'OL893415W',
            isbn13: '9780441013593',
            isbn10: '0441013597',
            pageCount: 612,
            publishedYear: 2005,
            language: 'eng',
            coverUrl: 'https://covers.openlibrary.org/b/id/11481354-M.jpg',
            publisher: 'Ace Books',
            otherIds: [{ source: 'goodreads', id: '234225' }, { source: 'librarything', id: '1066' }],
        });
    });

    test("derives the ISBN-13 from an ISBN-10", async () => {
        const edition = parseEdition(JSON.stringify({ ...dune, isbn_13: undefined }), english);
        expect(edition?.isbn13).toBe('9780441013593');
    });

    test("skips editions without a valid ISBN", async () => {
        expect(parseEdition(JSON.stringify({ ...dune, isbn_13: ['123'], isbn_10: [] }), english)).toBeNull();
        const noIsbn = JSON.stringify({ ...dune, isbn_13: undefined, isbn_10: undefined });
        expect(mightBeWantedEdition(noIsbn, english)).toBe(false);
    });

    test("applies the language filter", async () => {
        const french = JSON.stringify({ ...dune, languages: [{ key: '/languages/fre' }] });
        const none = JSON.stringify({ ...dune, languages: undefined });
        expect(mightBeWantedEdition(french, english)).toBe(false);
        expect(parseEdition(french, english)).toBeNull();
        expect(mightBeWantedEdition(none, { ...english, includeNoLanguage: true })).toBe(true);
        expect(parseEdition(none, english)).toBeNull();
        expect(parseEdition(none, { ...english, includeNoLanguage: true })?.language).toBeNull();
    });

    test("skips editions without a work, with a non-edition key, or with malformed JSON", async () => {
        expect(parseEdition(JSON.stringify({ ...dune, works: [] }), english)).toBeNull();
        expect(parseEdition(JSON.stringify({ ...dune, key: '/books/OL123' }), english)).toBeNull();
        expect(parseEdition('{not json', english)).toBeNull();
    });

    test("reads page counts given as strings and drops impossible ones", async () => {
        expect(parseEdition(JSON.stringify({ ...dune, number_of_pages: '412' }), english)?.pageCount).toBe(412);
        expect(parseEdition(JSON.stringify({ ...dune, number_of_pages: 0 }), english)?.pageCount).toBeNull();
    });
});

describe("parseWork", () => {
    const work = {
        key: '/works/OL893415W',
        title: '  Dune\n',
        description: { type: '/type/text', value: 'Set on the desert planet Arrakis...' },
        first_publish_date: '1965',
        subjects: ['Science fiction', ' ', 'Arrakis (Imaginary place)'],
        authors: [
            { author: { key: '/authors/OL79034A' }, type: { key: '/type/author_role' } },
            { author: { key: '/authors/OL79034A' } },
            { key: '/authors/OL2A' },
            { author: { key: '/books/OL1M' } },
        ],
    };

    test("maps the work, its subjects as XP signals, and its authors in order", async () => {
        expect(parseWork(JSON.stringify(work))).toEqual({
            work: {
                externalId: 'OL893415W',
                title: 'Dune',
                subtitle: null,
                description: 'Set on the desert planet Arrakis...',
                firstPublishedYear: 1965,
                signals: { subjects: ['Science fiction', 'Arrakis (Imaginary place)'] },
            },
            contributors: { workExternalId: 'OL893415W', contributorExternalIds: ['OL79034A', 'OL2A'], role: 'author' },
        });
    });

    test("skips works without a title", async () => {
        expect(parseWork(JSON.stringify({ ...work, title: '   ' }))).toBeNull();
    });

    test("clips titles to 255 characters", async () => {
        expect(parseWork(JSON.stringify({ ...work, title: 'x'.repeat(300) }))?.work.title).toHaveLength(255);
    });

    test("workAuthorKeys ignores entries that aren't author refs", async () => {
        expect(workAuthorKeys([null, 'x', { author: '/authors/OL5A' }])).toEqual(['OL5A']);
    });
});

describe("parseAuthor", () => {
    test("maps the author and their cross-reference IDs", async () => {
        expect(parseAuthor(JSON.stringify({
            key: '/authors/OL79034A',
            name: 'Frank Herbert',
            bio: 'American science fiction author.',
            birth_date: '8 October 1920',
            death_date: '1986',
            remote_ids: { wikidata: 'Q7934', viaf: '59078119', unknown: 'x' },
        }))).toEqual({
            externalId: 'OL79034A',
            name: 'Frank Herbert',
            bio: 'American science fiction author.',
            birthDate: '1920-10-08',
            deathDate: null,
            otherIds: [{ source: 'wikidata', id: 'Q7934' }, { source: 'viaf', id: '59078119' }],
        });
    });

    test("falls back to personal_name, and skips authors with no name", async () => {
        expect(parseAuthor(JSON.stringify({ key: '/authors/OL1A', personal_name: 'Moebius' }))?.name).toBe('Moebius');
        expect(parseAuthor(JSON.stringify({ key: '/authors/OL1A' }))).toBeNull();
    });
});
