import type { SQL } from 'bun';
import { mysql } from '../../bindings/mysql.ts';
import type { SourceName } from '../../types.ts';
import type { NewContributor } from '../types.ts';

type ContributorFields = Pick<NewContributor, 'name' | 'bio' | 'birthDate' | 'deathDate'>;
export function insertContributor(id: Buffer, d: ContributorFields, db: SQL = mysql) {
    return db`
        INSERT INTO contributors (id, name, bio, birth_date, death_date)
        VALUES (${id}, ${d.name}, ${d.bio ?? null}, ${d.birthDate ?? null}, ${d.deathDate ?? null});
    `;
}

export function insertContributorExternalId(contributorId: Buffer, source: SourceName, externalId: string, db: SQL = mysql) {
    return db`
        INSERT INTO contributor_external_ids (source_id, external_id, contributor_id)
        VALUES ((SELECT id FROM sources WHERE name = ${source}), ${externalId}, ${contributorId});
    `;
}

export function deleteContributorById(contributorId: Buffer, db: SQL = mysql) {
    return db`DELETE FROM contributors WHERE id = ${contributorId};`;
}
