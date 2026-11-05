import { mysql } from '../../bindings/mysql.ts';
import type { SourceName } from '../../types.ts';

// All work lookups return the same columns so repo.ts can map them with one function.

export function getWorkById(workId: Buffer) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.description, f.name AS format,
               w.first_published_year, w.page_count, w.xp, w.xp_version
        FROM works w
        LEFT JOIN formats f ON f.id = w.format_id
        WHERE w.id = ${workId};
    `;
}

export function getWorkByExternalId(source: SourceName, externalId: string) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.description, f.name AS format,
               w.first_published_year, w.page_count, w.xp, w.xp_version
        FROM works w
        LEFT JOIN formats f ON f.id = w.format_id
        JOIN work_external_ids x ON x.work_id = w.id
        JOIN sources s ON s.id = x.source_id
        WHERE s.name = ${source} AND x.external_id = ${externalId};
    `;
}

export function getWorksByContributorId(contributorId: Buffer) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.description, f.name AS format,
               w.first_published_year, w.page_count, w.xp, w.xp_version,
               r.name AS role
        FROM works w
        LEFT JOIN formats f ON f.id = w.format_id
        JOIN work_contributors wc ON wc.work_id = w.id
        JOIN contributor_roles r ON r.id = wc.role_id
        WHERE wc.contributor_id = ${contributorId}
        ORDER BY w.title;
    `;
}

export function getWorkExternalIds(workId: Buffer) {
    return mysql`
        SELECT s.name AS source, x.external_id AS id
        FROM work_external_ids x
        JOIN sources s ON s.id = x.source_id
        WHERE x.work_id = ${workId}
        ORDER BY s.priority DESC, s.name;
    `;
}

export function getEditionsByWorkId(workId: Buffer) {
    return mysql`
        SELECT e.id, e.work_id, e.title, e.isbn13, e.isbn10, e.page_count,
               e.published_year, e.language, e.cover_url
        FROM editions e
        WHERE e.work_id = ${workId}
        ORDER BY e.published_year, e.created_at;
    `;
}

export function getEditionExternalIds(editionId: Buffer) {
    return mysql`
        SELECT s.name AS source, x.external_id AS id
        FROM edition_external_ids x
        JOIN sources s ON s.id = x.source_id
        WHERE x.edition_id = ${editionId}
        ORDER BY s.priority DESC, s.name;
    `;
}

// Ordered by source priority so callers can take the first value they find per field.
export function getWorkSignals(workId: Buffer) {
    return mysql`
        SELECT s.name AS source, ws.signals, ws.fetched_at
        FROM work_signals ws
        JOIN sources s ON s.id = ws.source_id
        WHERE ws.work_id = ${workId}
        ORDER BY s.priority DESC;
    `;
}
