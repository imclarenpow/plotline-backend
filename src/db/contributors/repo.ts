import { mysql } from '../bindings/mysql.ts';
import { binaryToUuid, newUuid, toDateString, toExternalIds, uuidToBinary } from '../utils.ts';
import type { SourceName } from '../types.ts';
import * as lookups from './sql/lookups.ts';
import * as mutations from './sql/mutations.ts';
import type { Contributor, NewContributor } from './types.ts';

type Row = Record<string, any>;

function rowToContributor(row: Row): Contributor {
    return {
        id: binaryToUuid(row.id),
        name: row.name,
        bio: row.bio,
        birthDate: toDateString(row.birth_date),
        deathDate: toDateString(row.death_date),
    };
}

async function withExternalIds(contributor: Contributor): Promise<Contributor> {
    const ids = await lookups.getContributorExternalIds(uuidToBinary(contributor.id));
    return { ...contributor, externalIds: toExternalIds(ids) };
}

export async function getContributor(contributorId: string): Promise<Contributor | null> {
    const [row] = await lookups.getContributorById(uuidToBinary(contributorId));
    return row ? withExternalIds(rowToContributor(row)) : null;
}

export async function getContributorByExternalId(source: SourceName, externalId: string): Promise<Contributor | null> {
    const [row] = await lookups.getContributorByExternalId(source, externalId);
    return row ? withExternalIds(rowToContributor(row)) : null;
}

// Creates the contributor and their external IDs atomically.
export async function createContributor(newContributor: NewContributor): Promise<Contributor> {
    const id = newUuid();
    const bin = uuidToBinary(id);
    await mysql.begin(async tx => {
        await mutations.insertContributor(bin, newContributor, tx);
        for (const x of newContributor.externalIds ?? []) {
            await mutations.insertContributorExternalId(bin, x.source, x.id, tx);
        }
    });
    return (await getContributor(id))!;
}

export async function deleteContributor(contributorId: string): Promise<void> {
    await mutations.deleteContributorById(uuidToBinary(contributorId));
}
