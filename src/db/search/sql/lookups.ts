import { mysql } from '../../bindings/mysql.ts';
import { binaryIdsToJson } from '../../utils.ts';

// Catalog search. Title matches rank an exact title first, then by full-text relevance,
// then by how many editions the work has (a rough popularity signal).

export function searchWorksByTitle(booleanQuery: string, exactTitle: string, limit: number) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.first_published_year,
               MATCH(w.title, w.subtitle) AGAINST(${booleanQuery} IN BOOLEAN MODE) AS score
        FROM works w
        WHERE MATCH(w.title, w.subtitle) AGAINST(${booleanQuery} IN BOOLEAN MODE)
        ORDER BY (w.title = ${exactTitle}) DESC, score DESC, w.edition_count DESC
        LIMIT ${limit};
    `;
}

// For queries that are an author's name rather than a title.
export function searchWorksByContributor(booleanQuery: string, limit: number) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM contributors c
        JOIN work_contributors wc ON wc.contributor_id = c.id
        JOIN works w ON w.id = wc.work_id
        WHERE MATCH(c.name) AGAINST(${booleanQuery} IN BOOLEAN MODE)
        GROUP BY w.id
        ORDER BY MAX(w.edition_count) DESC
        LIMIT ${limit};
    `;
}

// Search with a word the index ignores, such as the title "It".
export function searchWorksByExactTitle(title: string, limit: number) {
    return mysql`
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM works w
        WHERE w.title = ${title}
        ORDER BY w.edition_count DESC
        LIMIT ${limit};
    `;
}

// Detail lookups for a page of results. Work IDs go in as JSON (see binaryIdsToJson).

// Every creator, once each: someone who both writes and draws a comic has two roles.
export function getContributorNamesForWorks(workIds: Uint8Array[]) {
    return mysql`
        SELECT wc.work_id, c.name, MIN(wc.position) AS position
        FROM JSON_TABLE(${binaryIdsToJson(workIds)}, '$[*]' COLUMNS (hex CHAR(32) PATH '$')) ids
        JOIN work_contributors wc ON wc.work_id = UNHEX(ids.hex)
        JOIN contributors c ON c.id = wc.contributor_id
        GROUP BY wc.work_id, c.id, c.name
        ORDER BY wc.work_id, position;
    `;
}

export function getOpenLibraryIdsForWorks(workIds: Uint8Array[]) {
    return mysql`
        SELECT x.work_id, x.external_id
        FROM JSON_TABLE(${binaryIdsToJson(workIds)}, '$[*]' COLUMNS (hex CHAR(32) PATH '$')) ids
        JOIN work_external_ids x ON x.work_id = UNHEX(ids.hex)
        JOIN sources s ON s.id = x.source_id
        WHERE s.name = 'openlibrary';
    `;
}

// Any one cover per work.
export function getCoversForWorks(workIds: Uint8Array[]) {
    return mysql`
        SELECT e.work_id, MAX(e.cover_url) AS cover_url
        FROM JSON_TABLE(${binaryIdsToJson(workIds)}, '$[*]' COLUMNS (hex CHAR(32) PATH '$')) ids
        JOIN editions e ON e.work_id = UNHEX(ids.hex)
        WHERE e.cover_url IS NOT NULL
        GROUP BY e.work_id;
    `;
}
