import { pg } from '../../bindings/postgres.ts';

// Catalog search. tsQuery comes from toTsQuery() and is normalised here with
// search_normalize(), matching how works.search_vector and contributors.search_vector are built.
// Title matches rank an exact title first, then full-text relevance, then how many editions
// the work has (a rough popularity signal).

export function searchWorksByTitle(tsQuery: string, exactTitle: string, limit: number) {
    return pg`
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM works w, to_tsquery('simple', search_normalize(${tsQuery})) q
        WHERE w.search_vector @@ q
        ORDER BY (search_normalize(w.title) = search_normalize(${exactTitle})) DESC,
                 ts_rank(w.search_vector, q) DESC, w.edition_count DESC
        LIMIT ${limit};
    `;
}

// For queries that are an author's name rather than a title.
export function searchWorksByContributor(tsQuery: string, limit: number) {
    return pg`
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM contributors c
        JOIN work_contributors wc ON wc.contributor_id = c.id
        JOIN works w ON w.id = wc.work_id
        WHERE c.search_vector @@ to_tsquery('simple', search_normalize(${tsQuery}))
        GROUP BY w.id
        ORDER BY w.edition_count DESC
        LIMIT ${limit};
    `;
}

// Detail lookups for a page of results.

// Every creator, once each: someone who both writes and draws a comic has two roles.
export function getContributorNamesForWorks(workIds: string[]) {
    return pg`
        SELECT wc.work_id, c.name, MIN(wc.position) AS position
        FROM work_contributors wc
        JOIN contributors c ON c.id = wc.contributor_id
        WHERE wc.work_id IN ${pg(workIds)}
        GROUP BY wc.work_id, c.id, c.name
        ORDER BY wc.work_id, position;
    `;
}

export function getOpenLibraryIdsForWorks(workIds: string[]) {
    return pg`
        SELECT x.work_id, x.external_id
        FROM work_external_ids x
        JOIN sources s ON s.id = x.source_id
        WHERE s.name = 'openlibrary' AND x.work_id IN ${pg(workIds)};
    `;
}

// Any one cover per work.
export function getCoversForWorks(workIds: string[]) {
    return pg`
        SELECT work_id, MAX(cover_url) AS cover_url
        FROM editions
        WHERE cover_url IS NOT NULL AND work_id IN ${pg(workIds)}
        GROUP BY work_id;
    `;
}
