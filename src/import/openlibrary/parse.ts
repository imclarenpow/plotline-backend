// Turns lines of the OpenLibrary dumps into import records. Pure functions, no I/O.
//
// Each dump line is tab-separated: type, key, revision, last_modified, JSON.
// The JSON is the full record; only the fields below are read, and each is validated
// with Zod because dump data is external input.
import { z } from 'zod';
import { bookCoverUrlById } from '../../config/openlibrary.ts';
import { assertDateString } from '../../db/utils.ts';
import type { ExternalId, SourceName } from '../../schemas/sources.ts';
import type { ImportContributor, ImportEdition, ImportWork, ImportWorkContributors } from '../../schemas/imports.ts';
import { olId } from '../../services/openlibrary/utils.ts';
import { isbn10To13, normalizeIsbn10, normalizeIsbn13 } from '../isbn.ts';

// Splits a dump line with indexOf rather than split(), so the JSON column is only copied
// out (by calling json()) for lines that pass the cheap type and key checks.
export function parseDumpLine(line: string): { type: string; key: string; json: () => string } | null {
    const t1 = line.indexOf('\t');
    const t2 = line.indexOf('\t', t1 + 1);
    const t3 = line.indexOf('\t', t2 + 1);
    const t4 = line.indexOf('\t', t3 + 1);
    if (t1 < 0 || t2 < 0 || t3 < 0 || t4 < 0) return null;
    return { type: line.slice(0, t1), key: line.slice(t1 + 1, t2), json: () => line.slice(t4 + 1) };
}

// '/works/OL123W' -> 123. Used for the compact ID sets, so the import can remember
// millions of keys in a few MB.
export function olNumber(key: string, suffix: 'W' | 'A' | 'M'): number | null {
    const match = /OL(\d+)([WAM])$/.exec(key);
    if (!match || match[2] !== suffix) return null;
    return Number(match[1]);
}

const TextValue = z.union([z.string(), z.object({ value: z.string() })]);
const KeyRef = z.object({ key: z.string() });
const StringList = z.array(z.unknown()).transform(xs => xs.filter((x): x is string => typeof x === 'string'));

const MAX_DESCRIPTION = 20_000;

// Descriptions and bios: keeps line breaks, unlike clip().
function textOf(value: z.infer<typeof TextValue> | undefined): string | null {
    if (value == null) return null;
    const text = (typeof value === 'string' ? value : value.value).replace(/\r\n?/g, '\n').trim();
    return text ? text.slice(0, MAX_DESCRIPTION) : null;
}

// Single-line fields: collapses whitespace and clips to a VARCHAR limit. VARCHAR counts
// characters, so long values are clipped by code point rather than UTF-16 unit.
function clip(text: string | null | undefined, max: number): string | null {
    if (!text) return null;
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return null;
    return clean.length <= max ? clean : [...clean].slice(0, max).join('');
}

const MAX_YEAR = new Date().getUTCFullYear() + 1;

// Free-text dates such as '1999', 'May 1999' or 'March 5, 1920' -> 1999.
export function parseYear(text: string | null | undefined): number | null {
    if (!text) return null;
    const match = /\b(\d{4})\b/.exec(text);
    if (!match) return null;
    const year = Number(match[1]);
    return year >= 1000 && year <= MAX_YEAR ? year : null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'];

// Only full dates become DATE values; '1920' or 'c. 1850' stay unknown rather than
// being guessed as 1 January.
export function parseFullDate(text: string | null | undefined): string | null {
    if (!text) return null;
    const t = text.trim().toLowerCase().replace(/\.$/, '');
    let y: number, m: number, d: number;
    let match: RegExpExecArray | null;
    if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) {
        [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    } else if ((match = /^(\d{1,2}) ([a-z]+),? (\d{4})$/.exec(t))) {
        [d, m, y] = [Number(match[1]), MONTHS.indexOf(match[2]!) + 1, Number(match[3])];
    } else if ((match = /^([a-z]+) (\d{1,2}),? (\d{4})$/.exec(t))) {
        [m, d, y] = [MONTHS.indexOf(match[1]!) + 1, Number(match[2]), Number(match[3])];
    } else {
        return null;
    }
    if (m < 1 || y < 1000) return null;
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    try {
        return assertDateString(date);
    } catch {
        return null;
    }
}

function parseJson(json: string): unknown {
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

// Identifier namespaces we keep. OpenLibrary's names match our source names.
const OL_IDENTIFIER_SOURCES = new Set<string>([
    'goodreads', 'librarything', 'amazon', 'wikidata', 'viaf', 'isni', 'storygraph', 'musicbrainz',
    'lc_naf', 'bookbrainz', 'project_gutenberg', 'librivox', 'inventaire', 'imdb',
] satisfies SourceName[]);

function identifiersToExternalIds(record: Record<string, unknown> | undefined): ExternalId[] {
    const ids: ExternalId[] = [];
    for (const [name, value] of Object.entries(record ?? {})) {
        if (!OL_IDENTIFIER_SOURCES.has(name)) continue;
        const source = name as SourceName;
        for (const id of Array.isArray(value) ? value : [value]) {
            if (typeof id === 'string' && id.trim() && id.length <= 255) ids.push({ source, id: id.trim() });
        }
    }
    return ids;
}

// ---------------------------------------------------------------------------
// Editions

const EditionJson = z.object({
    key: z.string(),
    works: z.array(KeyRef).optional(),
    isbn_13: StringList.optional(),
    isbn_10: StringList.optional(),
    languages: z.array(KeyRef).optional(),
    number_of_pages: z.unknown().optional(),
    publish_date: z.string().optional(),
    publishers: StringList.optional(),
    covers: z.array(z.unknown()).optional(),
    identifiers: z.record(z.string(), z.unknown()).optional(),
});

export type EditionFilter = { languages: readonly string[]; includeNoLanguage: boolean };

// Cheap string checks on an edition's JSON that skip most editions before JSON.parse.
// Must never reject one that parseEdition would accept.
export function mightBeWantedEdition(json: string, filter: EditionFilter): boolean {
    if (!json.includes('"isbn_1')) return false;
    return filter.includeNoLanguage || filter.languages.some(code => json.includes(`/languages/${code}"`));
}

function pageCount(value: unknown): number | null {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : null;
}

// Returns the edition if it has a valid ISBN, belongs to a work and passes the language filter.
export function parseEdition(json: string, filter: EditionFilter): ImportEdition | null {
    const parsed = EditionJson.safeParse(parseJson(json));
    if (!parsed.success) return null;
    const e = parsed.data;
    if (olNumber(e.key, 'M') == null) return null;

    const workKey = e.works?.[0]?.key;
    if (!workKey || olNumber(workKey, 'W') == null) return null;

    const language = e.languages?.map(l => olId(l.key)).find(code => /^[a-z]{3}$/.test(code)) ?? null;
    if (language ? !filter.languages.includes(language) : !filter.includeNoLanguage) return null;

    const isbn10 = (e.isbn_10 ?? []).map(normalizeIsbn10).find(Boolean) ?? null;
    const isbn13 = (e.isbn_13 ?? []).map(normalizeIsbn13).find(Boolean) ?? (isbn10 ? isbn10To13(isbn10) : null);
    if (!isbn13 && !isbn10) return null;

    const cover = e.covers?.find((c): c is number => typeof c === 'number' && c > 0);
    return {
        externalId: olId(e.key),
        workExternalId: olId(workKey),
        isbn13,
        isbn10,
        pageCount: pageCount(e.number_of_pages),
        publishedYear: parseYear(e.publish_date),
        language,
        coverUrl: cover ? bookCoverUrlById(cover) : null,
        publisher: clip(e.publishers?.[0], 255),
        otherIds: identifiersToExternalIds(e.identifiers),
    };
}

// ---------------------------------------------------------------------------
// Works

const AuthorRef = z.union([
    z.object({ author: KeyRef }).transform(a => a.author.key),
    z.object({ author: z.string() }).transform(a => a.author),
    KeyRef.transform(a => a.key),
]);

const WorkJson = z.object({
    key: z.string(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: TextValue.optional(),
    first_publish_date: z.string().optional(),
    subjects: StringList.optional(),
    authors: z.array(z.unknown()).optional(),
});

// Author IDs in display order, without duplicates.
export function workAuthorKeys(authors: unknown[] | undefined): string[] {
    const keys = new Set<string>();
    for (const a of authors ?? []) {
        const parsed = AuthorRef.safeParse(a);
        if (parsed.success && olNumber(parsed.data, 'A') != null) keys.add(olId(parsed.data));
    }
    return [...keys];
}

export function parseWork(json: string): { work: ImportWork; contributors: ImportWorkContributors } | null {
    const parsed = WorkJson.safeParse(parseJson(json));
    if (!parsed.success) return null;
    const w = parsed.data;
    const title = clip(w.title, 255);
    if (!title) return null;

    const subjects = (w.subjects ?? []).map(s => s.trim()).filter(Boolean).slice(0, 100);
    const externalId = olId(w.key);
    return {
        work: {
            externalId,
            title,
            subtitle: clip(w.subtitle, 255),
            description: textOf(w.description),
            firstPublishedYear: parseYear(w.first_publish_date),
            signals: subjects.length ? { subjects } : null,
        },
        contributors: { workExternalId: externalId, contributorExternalIds: workAuthorKeys(w.authors), role: 'author' },
    };
}

// ---------------------------------------------------------------------------
// Authors

const AuthorJson = z.object({
    key: z.string(),
    name: z.string().optional(),
    personal_name: z.string().optional(),
    bio: TextValue.optional(),
    birth_date: z.string().optional(),
    death_date: z.string().optional(),
    remote_ids: z.record(z.string(), z.unknown()).optional(),
});

export function parseAuthor(json: string): ImportContributor | null {
    const parsed = AuthorJson.safeParse(parseJson(json));
    if (!parsed.success) return null;
    const a = parsed.data;
    const name = clip(a.name, 255) ?? clip(a.personal_name, 255);
    if (!name) return null;
    return {
        externalId: olId(a.key),
        name,
        bio: textOf(a.bio),
        birthDate: parseFullDate(a.birth_date),
        deathDate: parseFullDate(a.death_date),
        otherIds: identifiersToExternalIds(a.remote_ids),
    };
}
