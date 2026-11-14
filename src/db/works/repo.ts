import { pg } from '../bindings/postgres.ts';
import { newUuid, toExternalIds } from '../utils.ts';
import type { SourceName } from '../types.ts';
import * as lookups from './sql/lookups.ts';
import * as mutations from './sql/mutations.ts';
import type { ContributedWork, Edition, NewEdition, NewWork, Work, WorkSignals } from './types.ts';

type Row = Record<string, any>;

function rowToWork(row: Row): Work {
    return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        format: row.format,
        firstPublishedYear: row.first_published_year,
        pageCount: row.page_count,
        xp: row.xp,
        xpVersion: row.xp_version,
    };
}

function rowToEdition(row: Row): Edition {
    return {
        id: row.id,
        workId: row.work_id,
        title: row.title,
        isbn13: row.isbn13,
        isbn10: row.isbn10,
        pageCount: row.page_count,
        publishedYear: row.published_year,
        language: row.language,
        coverUrl: row.cover_url,
    };
}

async function withExternalIds(work: Work): Promise<Work> {
    const ids = await lookups.getWorkExternalIds(work.id);
    return { ...work, externalIds: toExternalIds(ids) };
}

export async function getWork(workId: string): Promise<Work | null> {
    const [row] = await lookups.getWorkById(workId);
    return row ? withExternalIds(rowToWork(row)) : null;
}

export async function getWorkByExternalId(source: SourceName, externalId: string): Promise<Work | null> {
    const [row] = await lookups.getWorkByExternalId(source, externalId);
    return row ? withExternalIds(rowToWork(row)) : null;
}

export async function getWorksByContributor(contributorId: string): Promise<ContributedWork[]> {
    const rows = await lookups.getWorksByContributorId(contributorId);
    return rows.map((row: Row) => ({ ...rowToWork(row), role: row.role }));
}

// Creates the work and its external IDs atomically.
export async function createWork(newWork: NewWork): Promise<Work> {
    const id = newUuid();
    await pg.begin(async tx => {
        await mutations.insertWork(id, newWork, tx);
        for (const x of newWork.externalIds ?? []) {
            await mutations.insertWorkExternalId(id, x.source, x.id, tx);
        }
    });
    return (await getWork(id))!;
}

export async function deleteWork(workId: string): Promise<void> {
    await mutations.deleteWorkById(workId);
}

export async function getEditions(workId: string): Promise<Edition[]> {
    const rows = await lookups.getEditionsByWorkId(workId);
    return Promise.all(rows.map(async (row: Row) => ({
        ...rowToEdition(row),
        externalIds: toExternalIds(await lookups.getEditionExternalIds(row.id)),
    })));
}

export async function addEdition(workId: string, newEdition: NewEdition): Promise<Edition> {
    const id = newUuid();
    await pg.begin(async tx => {
        await mutations.insertEdition(id, workId, newEdition, tx);
        for (const x of newEdition.externalIds ?? []) {
            await mutations.insertEditionExternalId(id, x.source, x.id, tx);
        }
    });
    return { ...newEdition, id, workId, externalIds: newEdition.externalIds ?? [] };
}

export async function linkContributor(workId: string, contributorId: string, role: string, position = 0): Promise<void> {
    await mutations.insertWorkContributor(workId, contributorId, role, position);
}

export async function setWorkSignals(workId: string, source: SourceName, signals: Record<string, unknown>): Promise<void> {
    await mutations.upsertWorkSignals(workId, source, signals);
}

// Highest-priority source first.
export async function getWorkSignals(workId: string): Promise<WorkSignals[]> {
    const rows = await lookups.getWorkSignals(workId);
    return rows.map((row: Row) => ({
        source: row.source,
        signals: row.signals, // jsonb arrives parsed
        fetchedAt: row.fetched_at,
    }));
}

export async function setWorkXp(workId: string, xp: number, xpVersion: number): Promise<void> {
    await mutations.updateWorkXp(workId, xp, xpVersion);
}
