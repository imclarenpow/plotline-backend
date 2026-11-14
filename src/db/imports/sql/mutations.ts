import type { SQL } from 'bun';
import { pg } from '../../bindings/postgres.ts';

// Multi-row writes for bulk imports. Callers must not pass empty arrays, and a batch must
// not contain the same key twice: Postgres refuses an ON CONFLICT DO UPDATE that would
// touch one row twice in a single statement.
//
// Upserts only fill fields that are still NULL, so an import never overwrites a value that
// a higher-priority source (or a person) already set. Titles and names are never replaced.

export type WorkRow = {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    first_published_year: number | null;
};

export function upsertWorks(rows: WorkRow[], db: SQL = pg) {
    return db`
        INSERT INTO works ${db(rows, 'id', 'title', 'subtitle', 'description', 'first_published_year')}
        ON CONFLICT (id) DO UPDATE SET
            subtitle = COALESCE(works.subtitle, EXCLUDED.subtitle),
            description = COALESCE(works.description, EXCLUDED.description),
            first_published_year = COALESCE(works.first_published_year, EXCLUDED.first_published_year);
    `;
}

export type ContributorRow = {
    id: string;
    name: string;
    bio: string | null;
    birth_date: string | null;
    death_date: string | null;
};

export function upsertContributors(rows: ContributorRow[], db: SQL = pg) {
    return db`
        INSERT INTO contributors ${db(rows, 'id', 'name', 'bio', 'birth_date', 'death_date')}
        ON CONFLICT (id) DO UPDATE SET
            bio = COALESCE(contributors.bio, EXCLUDED.bio),
            birth_date = COALESCE(contributors.birth_date, EXCLUDED.birth_date),
            death_date = COALESCE(contributors.death_date, EXCLUDED.death_date);
    `;
}

export type EditionRow = {
    id: string;
    work_id: string;
    publisher_id: string | null;
    isbn13: string | null;
    isbn10: string | null;
    page_count: number | null;
    published_year: number | null;
    language: string | null;
    cover_url: string | null;
};

// isbn13 is unique and only set on insert: the caller passes NULL for rows that already
// exist, so an update can never collide with another edition's ISBN.
export function upsertEditions(rows: EditionRow[], db: SQL = pg) {
    return db`
        INSERT INTO editions ${db(rows, 'id', 'work_id', 'publisher_id', 'isbn13', 'isbn10', 'page_count', 'published_year', 'language', 'cover_url')}
        ON CONFLICT (id) DO UPDATE SET
            publisher_id = COALESCE(editions.publisher_id, EXCLUDED.publisher_id),
            isbn10 = COALESCE(editions.isbn10, EXCLUDED.isbn10),
            page_count = COALESCE(editions.page_count, EXCLUDED.page_count),
            published_year = COALESCE(editions.published_year, EXCLUDED.published_year),
            language = COALESCE(editions.language, EXCLUDED.language),
            cover_url = COALESCE(editions.cover_url, EXCLUDED.cover_url);
    `;
}

export type ExternalIdRow<K extends string> = { source_id: number; external_id: string } & Record<K, string>;

// The importing source's own ID for a record. No ON CONFLICT: a clash here is a bug.
export function insertWorkExternalIds(rows: ExternalIdRow<'work_id'>[], db: SQL = pg) {
    return db`INSERT INTO work_external_ids ${db(rows, 'source_id', 'external_id', 'work_id')};`;
}

export function insertContributorExternalIds(rows: ExternalIdRow<'contributor_id'>[], db: SQL = pg) {
    return db`INSERT INTO contributor_external_ids ${db(rows, 'source_id', 'external_id', 'contributor_id')};`;
}

export function insertEditionExternalIds(rows: ExternalIdRow<'edition_id'>[], db: SQL = pg) {
    return db`INSERT INTO edition_external_ids ${db(rows, 'source_id', 'external_id', 'edition_id')};`;
}

// Cross-reference IDs (goodreads, wikidata, ...). Sources contain duplicate records that share
// these IDs, and an ID can only point at one record, so the first one wins.
export function insertContributorExternalIdsIfNew(rows: ExternalIdRow<'contributor_id'>[], db: SQL = pg) {
    return db`INSERT INTO contributor_external_ids ${db(rows, 'source_id', 'external_id', 'contributor_id')} ON CONFLICT DO NOTHING;`;
}

export function insertEditionExternalIdsIfNew(rows: ExternalIdRow<'edition_id'>[], db: SQL = pg) {
    return db`INSERT INTO edition_external_ids ${db(rows, 'source_id', 'external_id', 'edition_id')} ON CONFLICT DO NOTHING;`;
}

export type WorkContributorRow = { work_id: string; contributor_id: string; role_id: number; position: number };

// result.count is the number of links actually inserted.
export function insertWorkContributorsIfNew(rows: WorkContributorRow[], db: SQL = pg) {
    return db`INSERT INTO work_contributors ${db(rows, 'work_id', 'contributor_id', 'role_id', 'position')} ON CONFLICT DO NOTHING;`;
}

export function insertPublishersIfNew(rows: { id: string; name: string }[], db: SQL = pg) {
    return db`INSERT INTO publishers ${db(rows, 'id', 'name')} ON CONFLICT DO NOTHING;`;
}

// signals is an object: Bun encodes it for the jsonb column.
export type WorkSignalsRow = { work_id: string; source_id: number; signals: Record<string, unknown> };

export function upsertWorkSignals(rows: WorkSignalsRow[], db: SQL = pg) {
    return db`
        INSERT INTO work_signals ${db(rows, 'work_id', 'source_id', 'signals')}
        ON CONFLICT (work_id, source_id) DO UPDATE SET signals = EXCLUDED.signals, fetched_at = now();
    `;
}

// works.edition_count ranks search results. One statement over the whole catalog; only
// rows whose count changed are written.
export function refreshEditionCounts(db: SQL = pg) {
    return db`
        UPDATE works w
        SET edition_count = COALESCE(e.n, 0)
        FROM works w2
        LEFT JOIN (SELECT work_id, COUNT(*)::int AS n FROM editions GROUP BY work_id) e ON e.work_id = w2.id
        WHERE w.id = w2.id AND w.edition_count IS DISTINCT FROM COALESCE(e.n, 0);
    `;
}

// After a bulk import: VACUUM merges the GIN search indexes' pending lists (bulk inserts park
// new entries there, and every search scans them until merged), and ANALYZE refreshes the
// planner's statistics. Can't run inside a transaction.
export function vacuumCatalog(db: SQL = pg) {
    return db`
        VACUUM (ANALYZE) works, contributors, editions, work_contributors, work_signals, publishers,
            work_external_ids, contributor_external_ids, edition_external_ids;
    `;
}

export function insertImportRun(sourceId: number, db: SQL = pg) {
    return db`INSERT INTO import_runs (source_id) VALUES (${sourceId}) RETURNING id;`;
}

export function finishImportRun(id: string, status: 'succeeded' | 'failed', stats: Record<string, unknown>, error: string | null, db: SQL = pg) {
    return db`
        UPDATE import_runs
        SET status = ${status}, finished_at = now(), stats = ${stats}, error = ${error}
        WHERE id = ${id};
    `;
}
