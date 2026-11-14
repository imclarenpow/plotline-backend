import type { SQL } from 'bun';
import { mysql } from '../../bindings/mysql.ts';

// Multi-row writes for bulk imports. Callers must not pass empty arrays.
//
// Upserts only fill fields that are still NULL, so an import never overwrites a value that
// a higher-priority source (or a person) already set. Titles and names are never replaced.

export type WorkRow = {
    id: Buffer;
    title: string;
    subtitle: string | null;
    description: string | null;
    first_published_year: number | null;
};

export function upsertWorks(rows: WorkRow[], db: SQL = mysql) {
    return db`
        INSERT INTO works ${db(rows, 'id', 'title', 'subtitle', 'description', 'first_published_year')} AS new
        ON DUPLICATE KEY UPDATE
            subtitle = COALESCE(works.subtitle, new.subtitle),
            description = COALESCE(works.description, new.description),
            first_published_year = COALESCE(works.first_published_year, new.first_published_year);
    `;
}

export type ContributorRow = {
    id: Buffer;
    name: string;
    bio: string | null;
    birth_date: string | null;
    death_date: string | null;
};

export function upsertContributors(rows: ContributorRow[], db: SQL = mysql) {
    return db`
        INSERT INTO contributors ${db(rows, 'id', 'name', 'bio', 'birth_date', 'death_date')} AS new
        ON DUPLICATE KEY UPDATE
            bio = COALESCE(contributors.bio, new.bio),
            birth_date = COALESCE(contributors.birth_date, new.birth_date),
            death_date = COALESCE(contributors.death_date, new.death_date);
    `;
}

export type EditionRow = {
    id: Buffer;
    work_id: Buffer;
    publisher_id: Buffer | null;
    isbn13: string | null;
    isbn10: string | null;
    page_count: number | null;
    published_year: number | null;
    language: string | null;
    cover_url: string | null;
};

// isbn13 is unique, so it is only set on insert: the caller passes NULL for rows that
// already exist, otherwise the upsert could match a different edition by ISBN.
export function upsertEditions(rows: EditionRow[], db: SQL = mysql) {
    return db`
        INSERT INTO editions ${db(rows, 'id', 'work_id', 'publisher_id', 'isbn13', 'isbn10', 'page_count', 'published_year', 'language', 'cover_url')} AS new
        ON DUPLICATE KEY UPDATE
            publisher_id = COALESCE(editions.publisher_id, new.publisher_id),
            isbn10 = COALESCE(editions.isbn10, new.isbn10),
            page_count = COALESCE(editions.page_count, new.page_count),
            published_year = COALESCE(editions.published_year, new.published_year),
            language = COALESCE(editions.language, new.language),
            cover_url = COALESCE(editions.cover_url, new.cover_url);
    `;
}

export type ExternalIdRow<K extends string> = { source_id: number; external_id: string } & Record<K, Buffer>;

// The importing source's own ID for a record. Not IGNORE: a clash here is a bug.
export function insertWorkExternalIds(rows: ExternalIdRow<'work_id'>[], db: SQL = mysql) {
    return db`INSERT INTO work_external_ids ${db(rows, 'source_id', 'external_id', 'work_id')};`;
}

export function insertContributorExternalIds(rows: ExternalIdRow<'contributor_id'>[], db: SQL = mysql) {
    return db`INSERT INTO contributor_external_ids ${db(rows, 'source_id', 'external_id', 'contributor_id')};`;
}

export function insertEditionExternalIds(rows: ExternalIdRow<'edition_id'>[], db: SQL = mysql) {
    return db`INSERT INTO edition_external_ids ${db(rows, 'source_id', 'external_id', 'edition_id')};`;
}

// Cross-reference IDs (goodreads, wikidata, ...). Sources contain duplicate records that share
// these IDs, and an ID can only point at one record, so the first one wins.
export function insertIgnoreContributorExternalIds(rows: ExternalIdRow<'contributor_id'>[], db: SQL = mysql) {
    return db`INSERT IGNORE INTO contributor_external_ids ${db(rows, 'source_id', 'external_id', 'contributor_id')};`;
}

export function insertIgnoreEditionExternalIds(rows: ExternalIdRow<'edition_id'>[], db: SQL = mysql) {
    return db`INSERT IGNORE INTO edition_external_ids ${db(rows, 'source_id', 'external_id', 'edition_id')};`;
}

export type WorkContributorRow = { work_id: Buffer; contributor_id: Buffer; role_id: number; position: number };

export function insertIgnoreWorkContributors(rows: WorkContributorRow[], db: SQL = mysql) {
    return db`INSERT IGNORE INTO work_contributors ${db(rows, 'work_id', 'contributor_id', 'role_id', 'position')};`;
}

export function insertIgnorePublishers(rows: { id: Buffer; name: string }[], db: SQL = mysql) {
    return db`INSERT IGNORE INTO publishers ${db(rows, 'id', 'name')};`;
}

export type WorkSignalsRow = { work_id: Buffer; source_id: number; signals: string };

export function upsertWorkSignals(rows: WorkSignalsRow[], db: SQL = mysql) {
    return db`
        INSERT INTO work_signals ${db(rows, 'work_id', 'source_id', 'signals')} AS new
        ON DUPLICATE KEY UPDATE signals = new.signals, fetched_at = CURRENT_TIMESTAMP;
    `;
}

// works.edition_count ranks search results. One statement over the whole catalog.
export function refreshEditionCounts(db: SQL = mysql) {
    return db`
        UPDATE works w
        LEFT JOIN (SELECT work_id, COUNT(*) AS n FROM editions GROUP BY work_id) e ON e.work_id = w.id
        SET w.edition_count = COALESCE(e.n, 0);
    `;
}

export function insertImportRun(id: Buffer, sourceId: number, db: SQL = mysql) {
    return db`INSERT INTO import_runs (id, source_id) VALUES (${id}, ${sourceId});`;
}

export function finishImportRun(id: Buffer, status: 'succeeded' | 'failed', stats: Record<string, unknown>, error: string | null, db: SQL = mysql) {
    return db`
        UPDATE import_runs
        SET status = ${status}, finished_at = CURRENT_TIMESTAMP, stats = ${JSON.stringify(stats)}, error = ${error}
        WHERE id = ${id};
    `;
}
