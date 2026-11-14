import type { SQL } from 'bun';
import { pg } from '../../bindings/postgres.ts';

// Batch lookups used while importing. Each takes an executor so it can run inside the
// batch's transaction, and callers must not pass empty arrays (IN () is invalid SQL).

export function getAllSourceIds(db: SQL = pg) {
    return db`SELECT id, name FROM sources;`;
}

// The dump date recorded by the source's most recent successful import run, if any.
export function getLastImportedDumpDate(source: string, db: SQL = pg) {
    return db`
        SELECT r.stats->'dump'->>'date' AS date
        FROM import_runs r
        JOIN sources s ON s.id = r.source_id
        WHERE s.name = ${source} AND r.status = 'succeeded'
        ORDER BY r.started_at DESC
        LIMIT 1;
    `;
}

export function getRoleIdByName(name: string, db: SQL = pg) {
    return db`SELECT id FROM contributor_roles WHERE name = ${name};`;
}

export function getWorkIdsByExternalIds(sourceId: number, externalIds: string[], db: SQL = pg) {
    return db`
        SELECT external_id, work_id FROM work_external_ids
        WHERE source_id = ${sourceId} AND external_id IN ${db(externalIds)};
    `;
}

export function getContributorIdsByExternalIds(sourceId: number, externalIds: string[], db: SQL = pg) {
    return db`
        SELECT external_id, contributor_id FROM contributor_external_ids
        WHERE source_id = ${sourceId} AND external_id IN ${db(externalIds)};
    `;
}

export function getEditionIdsByExternalIds(sourceId: number, externalIds: string[], db: SQL = pg) {
    return db`
        SELECT external_id, edition_id FROM edition_external_ids
        WHERE source_id = ${sourceId} AND external_id IN ${db(externalIds)};
    `;
}

export function getEditionIdsByIsbn13(isbns: string[], db: SQL = pg) {
    return db`SELECT id, isbn13 FROM editions WHERE isbn13 IN ${db(isbns)};`;
}

export function getPublisherIdsByName(names: string[], db: SQL = pg) {
    return db`SELECT id, name FROM publishers WHERE name IN ${db(names)};`;
}
