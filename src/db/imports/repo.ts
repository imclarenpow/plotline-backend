// Bulk writes for importers (see docs/imports.md). Each function takes one batch of records
// from a source, matches them to existing rows by that source's external IDs, and writes the
// batch in one transaction. Re-importing the same records updates rather than duplicates.
import type { SQL } from 'bun';
import { mysql } from '../bindings/mysql.ts';
import { newUuid, uuidToBinary } from '../utils.ts';
import { uniqueBy } from '../../utils/general.ts';
import type { ExternalId, SourceName } from '../types.ts';
import type { ImportContributor, ImportEdition, ImportWork, ImportWorkContributors } from './types.ts';
import * as lookups from './sql/lookups.ts';
import * as mutations from './sql/mutations.ts';

type Row = Record<string, any>;
export type BatchResult = { created: number; updated: number; skipped: number };
const NOTHING: BatchResult = { created: 0, updated: 0, skipped: 0 };

// Lookup-table IDs and publisher IDs, loaded once per process. Publishers repeat across
// almost every batch, so caching them saves two queries per edition batch.
const sourceIds = new Map<string, number>();
const roleIds = new Map<string, number>();
const publisherIds = new Map<string, Buffer>();

async function loadSourceIds(): Promise<void> {
    if (!sourceIds.size) {
        for (const row of await lookups.getAllSourceIds()) sourceIds.set(row.name, row.id);
    }
}

async function sourceId(name: string): Promise<number> {
    await loadSourceIds();
    const id = sourceIds.get(name);
    if (id == null) throw new Error(`Unknown source: ${name}`);
    return id;
}

async function roleId(name: string): Promise<number> {
    if (!roleIds.has(name)) {
        const [row] = await lookups.getRoleIdByName(name);
        if (!row) throw new Error(`Unknown contributor role: ${name}`);
        roleIds.set(name, row.id);
    }
    return roleIds.get(name)!;
}

const newId = () => uuidToBinary(newUuid());

function idMap(rows: Iterable<Row>, keyColumn: string, idColumn: string): Map<string, Buffer> {
    const map = new Map<string, Buffer>();
    for (const row of rows) map.set(row[keyColumn], Buffer.from(row[idColumn]));
    return map;
}

// Gives each record its existing row ID, or a new one plus the external ID row that links it.
function assignIds<K extends string>(
    externalIds: string[], existing: Map<string, Buffer>, src: number, column: K,
): { ids: Buffer[]; newIds: mutations.ExternalIdRow<K>[] } {
    const newIds: mutations.ExternalIdRow<K>[] = [];
    const ids = externalIds.map(externalId => {
        const found = existing.get(externalId);
        if (found) return found;
        const id = newId();
        newIds.push({ source_id: src, external_id: externalId, [column]: id } as mutations.ExternalIdRow<K>);
        return id;
    });
    return { ids, newIds };
}

// Cross-reference IDs (goodreads, wikidata, ...) for each written row. Sources must be loaded.
function otherIdRows<K extends string>(column: K, owners: { id: Buffer; otherIds: ExternalId[] }[]) {
    return owners.flatMap(({ id, otherIds }) => otherIds.map(x => {
        const source_id = sourceIds.get(x.source);
        if (source_id == null) throw new Error(`Unknown source: ${x.source}`);
        return { source_id, external_id: x.id, [column]: id } as mutations.ExternalIdRow<K>;
    }));
}

export async function importWorks(source: SourceName, batch: ImportWork[]): Promise<BatchResult> {
    const works = uniqueBy(batch, w => w.externalId);
    if (!works.length) return NOTHING;
    const src = await sourceId(source);

    return mysql.begin(async tx => {
        const externalIds = works.map(w => w.externalId);
        const existing = idMap(await lookups.getWorkIdsByExternalIds(src, externalIds, tx), 'external_id', 'work_id');
        const { ids, newIds } = assignIds(externalIds, existing, src, 'work_id');

        await mutations.upsertWorks(works.map((w, i) => ({
            id: ids[i]!, title: w.title, subtitle: w.subtitle, description: w.description, first_published_year: w.firstPublishedYear,
        })), tx);
        if (newIds.length) await mutations.insertWorkExternalIds(newIds, tx);

        const signals = works.flatMap((w, i) => w.signals
            ? [{ work_id: ids[i]!, source_id: src, signals: JSON.stringify(w.signals) }]
            : []);
        if (signals.length) await mutations.upsertWorkSignals(signals, tx);

        return { created: newIds.length, updated: works.length - newIds.length, skipped: 0 };
    });
}

export async function importContributors(source: SourceName, batch: ImportContributor[]): Promise<BatchResult> {
    const people = uniqueBy(batch, c => c.externalId);
    if (!people.length) return NOTHING;
    const src = await sourceId(source);

    return mysql.begin(async tx => {
        const externalIds = people.map(c => c.externalId);
        const existing = idMap(await lookups.getContributorIdsByExternalIds(src, externalIds, tx), 'external_id', 'contributor_id');
        const { ids, newIds } = assignIds(externalIds, existing, src, 'contributor_id');

        await mutations.upsertContributors(people.map((c, i) => ({
            id: ids[i]!, name: c.name, bio: c.bio, birth_date: c.birthDate, death_date: c.deathDate,
        })), tx);
        if (newIds.length) await mutations.insertContributorExternalIds(newIds, tx);

        const others = otherIdRows('contributor_id', people.map((c, i) => ({ id: ids[i]!, otherIds: c.otherIds })));
        if (others.length) await mutations.insertIgnoreContributorExternalIds(others, tx);

        return { created: newIds.length, updated: people.length - newIds.length, skipped: 0 };
    });
}

// Links works to contributors that were imported earlier. Links whose work or contributor
// isn't in the catalog are skipped. Existing links are left alone.
export async function importWorkContributors(source: SourceName, batch: ImportWorkContributors[]): Promise<BatchResult> {
    const links = batch.filter(l => l.contributorExternalIds.length);
    if (!links.length) return NOTHING;
    const src = await sourceId(source);
    const roles = new Map<string, number>();
    for (const role of new Set(links.map(l => l.role))) roles.set(role, await roleId(role));

    const [workRows, contributorRows] = await Promise.all([
        lookups.getWorkIdsByExternalIds(src, links.map(l => l.workExternalId)),
        lookups.getContributorIdsByExternalIds(src, [...new Set(links.flatMap(l => l.contributorExternalIds))]),
    ]);
    const works = idMap(workRows, 'external_id', 'work_id');
    const contributors = idMap(contributorRows, 'external_id', 'contributor_id');

    const rows: mutations.WorkContributorRow[] = [];
    let skipped = 0;
    for (const link of links) {
        const workId = works.get(link.workExternalId);
        // position is TINYINT UNSIGNED
        link.contributorExternalIds.slice(0, 255).forEach((externalId, position) => {
            const contributorId = contributors.get(externalId);
            if (workId && contributorId) rows.push({ work_id: workId, contributor_id: contributorId, role_id: roles.get(link.role)!, position });
            else skipped++;
        });
    }
    // Links that already exist are ignored, so count only the rows actually inserted.
    const inserted = rows.length ? Number((await mutations.insertIgnoreWorkContributors(rows)).affectedRows ?? 0) : 0;
    return { created: inserted, updated: 0, skipped };
}

// Accent- and case-insensitive key, matching the utf8mb4_0900_ai_ci collation closely enough
// to map publisher names back to their rows.
function nameKey(name: string): string {
    return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Publisher IDs by name, creating publishers not seen before. IDs found or created in this
// transaction go into `fresh`; the caller adds them to the cache only once it commits.
async function publisherIdsFor(names: string[], fresh: Map<string, Buffer>, tx: SQL) {
    const missing = [...new Set(names)].filter(name => !publisherIds.has(nameKey(name)));
    if (missing.length) {
        await mutations.insertIgnorePublishers(missing.map(name => ({ id: newId(), name })), tx);
        for (const row of await lookups.getPublisherIdsByName(missing, tx)) {
            fresh.set(nameKey(row.name), Buffer.from(row.id));
        }
    }
    return (name: string | null) => {
        if (!name) return null;
        const key = nameKey(name);
        return publisherIds.get(key) ?? fresh.get(key) ?? null;
    };
}

// Editions whose work isn't in the catalog are skipped. An edition whose ISBN-13 already
// belongs to another edition is merged into it: sources hold duplicate printings, and an
// ISBN identifies one printing.
export async function importEditions(source: SourceName, batch: ImportEdition[]): Promise<BatchResult> {
    const editions = uniqueBy(batch, e => e.externalId);
    if (!editions.length) return NOTHING;
    const src = await sourceId(source);
    const freshPublishers = new Map<string, Buffer>();

    const result = await mysql.begin(async tx => {
        const works = idMap(await lookups.getWorkIdsByExternalIds(src, [...new Set(editions.map(e => e.workExternalId))], tx), 'external_id', 'work_id');
        const kept = editions.filter(e => works.has(e.workExternalId));
        if (!kept.length) return { ...NOTHING, skipped: editions.length };

        const existing = idMap(await lookups.getEditionIdsByExternalIds(src, kept.map(e => e.externalId), tx), 'external_id', 'edition_id');
        const isbns = [...new Set(kept.filter(e => !existing.has(e.externalId) && e.isbn13).map(e => e.isbn13!))];
        const byIsbn = isbns.length ? idMap(await lookups.getEditionIdsByIsbn13(isbns, tx), 'isbn13', 'id') : new Map<string, Buffer>();
        const publisherId = await publisherIdsFor(kept.flatMap(e => (e.publisher ? [e.publisher] : [])), freshPublishers, tx);

        const rows: mutations.EditionRow[] = [];
        const newIds: mutations.ExternalIdRow<'edition_id'>[] = [];
        let created = 0;
        for (const e of kept) {
            let id = existing.get(e.externalId) ?? (e.isbn13 ? byIsbn.get(e.isbn13) : undefined);
            const isNew = !id;
            if (!id) {
                id = newId();
                created++;
                if (e.isbn13) byIsbn.set(e.isbn13, id);
            }
            if (!existing.has(e.externalId)) newIds.push({ source_id: src, external_id: e.externalId, edition_id: id });
            rows.push({
                id,
                work_id: works.get(e.workExternalId)!,
                publisher_id: publisherId(e.publisher),
                isbn13: isNew ? e.isbn13 : null,
                isbn10: e.isbn10,
                page_count: e.pageCount,
                published_year: e.publishedYear,
                language: e.language,
                cover_url: e.coverUrl,
            });
        }
        await mutations.upsertEditions(rows, tx);
        if (newIds.length) await mutations.insertEditionExternalIds(newIds, tx);

        const others = otherIdRows('edition_id', kept.map((e, i) => ({ id: rows[i]!.id, otherIds: e.otherIds })));
        if (others.length) await mutations.insertIgnoreEditionExternalIds(others, tx);

        return { created, updated: kept.length - created, skipped: editions.length - kept.length };
    });
    for (const [key, id] of freshPublishers) publisherIds.set(key, id);
    return result;
}

export async function startImportRun(source: SourceName): Promise<Buffer> {
    const id = newId();
    await mutations.insertImportRun(id, await sourceId(source));
    return id;
}

// On success, also recalculates works.edition_count (search ranking), so no importer can
// forget to.
export async function finishImportRun(id: Buffer, stats: Record<string, unknown>, error?: unknown): Promise<void> {
    if (error == null) {
        await mutations.refreshEditionCounts();
        await mutations.finishImportRun(id, 'succeeded', stats, null);
    } else {
        const message = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
        await mutations.finishImportRun(id, 'failed', stats, message);
    }
}
