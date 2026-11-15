import { pg } from '../../bindings/postgres.ts';
import type { SourceName } from '../../types.ts';

export function getContributorById(contributorId: string) {
    return pg`
        SELECT c.id, c.name, c.bio, c.birth_date::text AS birth_date, c.death_date::text AS death_date
        FROM contributors c
        WHERE c.id = ${contributorId};
    `;
}

export function getContributorByExternalId(source: SourceName, externalId: string) {
    return pg`
        SELECT c.id, c.name, c.bio, c.birth_date::text AS birth_date, c.death_date::text AS death_date
        FROM contributors c
        JOIN contributor_external_ids x ON x.contributor_id = c.id
        JOIN sources s ON s.id = x.source_id
        WHERE s.name = ${source} AND x.external_id = ${externalId};
    `;
}

export function getContributorExternalIds(contributorId: string) {
    return pg`
        SELECT s.name AS source, x.external_id AS id
        FROM contributor_external_ids x
        JOIN sources s ON s.id = x.source_id
        WHERE x.contributor_id = ${contributorId}
        ORDER BY s.priority DESC, s.name;
    `;
}
