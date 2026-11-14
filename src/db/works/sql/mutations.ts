import type { SQL } from 'bun';
import { pg } from '../../bindings/postgres.ts';
import type { SourceName } from '../../types.ts';
import type { NewEdition, NewWork } from '../types.ts';

// Every mutation takes an optional executor so the repo can run several inside one transaction.
// Lookup names (format, source, role) are resolved with subqueries; an unknown source or role
// resolves to NULL and fails the NOT NULL constraint instead of being silently dropped.

type WorkFields = Pick<NewWork, 'title' | 'subtitle' | 'description' | 'format' | 'firstPublishedYear' | 'pageCount'>;
export function insertWork(id: string, d: WorkFields, db: SQL = pg) {
    return db`
        INSERT INTO works (id, title, subtitle, description, format_id, first_published_year, page_count)
        VALUES (
            ${id}, ${d.title}, ${d.subtitle ?? null}, ${d.description ?? null},
            (SELECT id FROM formats WHERE name = ${d.format ?? null}),
            ${d.firstPublishedYear ?? null}, ${d.pageCount ?? null}
        );
    `;
}

export function insertWorkExternalId(workId: string, source: SourceName, externalId: string, db: SQL = pg) {
    return db`
        INSERT INTO work_external_ids (source_id, external_id, work_id)
        VALUES ((SELECT id FROM sources WHERE name = ${source}), ${externalId}, ${workId});
    `;
}

type EditionFields = Pick<NewEdition, 'title' | 'isbn13' | 'isbn10' | 'pageCount' | 'publishedYear' | 'language' | 'coverUrl'>;
export function insertEdition(id: string, workId: string, d: EditionFields, db: SQL = pg) {
    return db`
        INSERT INTO editions (id, work_id, title, isbn13, isbn10, page_count, published_year, language, cover_url)
        VALUES (
            ${id}, ${workId}, ${d.title ?? null}, ${d.isbn13 ?? null}, ${d.isbn10 ?? null},
            ${d.pageCount ?? null}, ${d.publishedYear ?? null}, ${d.language ?? null}, ${d.coverUrl ?? null}
        );
    `;
}

export function insertEditionExternalId(editionId: string, source: SourceName, externalId: string, db: SQL = pg) {
    return db`
        INSERT INTO edition_external_ids (source_id, external_id, edition_id)
        VALUES ((SELECT id FROM sources WHERE name = ${source}), ${externalId}, ${editionId});
    `;
}

export function insertWorkContributor(workId: string, contributorId: string, role: string, position: number, db: SQL = pg) {
    return db`
        INSERT INTO work_contributors (work_id, contributor_id, role_id, position)
        VALUES (${workId}, ${contributorId}, (SELECT id FROM contributor_roles WHERE name = ${role}), ${position});
    `;
}

// One row per (work, source); a re-fetch replaces the previous signals.
// signals is passed as an object: Bun encodes it for the jsonb column.
export function upsertWorkSignals(workId: string, source: SourceName, signals: Record<string, unknown>, db: SQL = pg) {
    return db`
        INSERT INTO work_signals (work_id, source_id, signals)
        VALUES (${workId}, (SELECT id FROM sources WHERE name = ${source}), ${signals})
        ON CONFLICT (work_id, source_id) DO UPDATE SET signals = EXCLUDED.signals, fetched_at = now();
    `;
}

export function updateWorkXp(workId: string, xp: number, xpVersion: number, db: SQL = pg) {
    return db`
        UPDATE works
        SET xp = ${xp}, xp_version = ${xpVersion}, xp_updated_at = now()
        WHERE id = ${workId};
    `;
}

export function deleteWorkById(workId: string, db: SQL = pg) {
    return db`DELETE FROM works WHERE id = ${workId};`;
}
