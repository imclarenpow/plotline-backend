import { pg } from '../../bindings/postgres.ts';

// Catalog search. tsQuery comes from toTsQuery() and text is what the user typed; both are
// normalised here with search_normalize(), the function the search columns and indexes use.

// Works whose title is exactly the query, ignoring case and accents (idx_works_title_normalized).
export function searchWorksByExactTitle(text: string, limit: number) {
    return pg`
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM works w
        WHERE search_normalize(w.title) = search_normalize(${text})
        ORDER BY w.edition_count DESC
        LIMIT ${limit};
    `;
}

// Full-text title matches, ranked by relevance and then edition count (a rough popularity
// signal). At most maxCandidates matches are ranked, so a very common word stays cheap.
export function searchWorksByTitle(tsQuery: string, limit: number, maxCandidates: number) {
    return pg`
        WITH q AS (SELECT to_tsquery('simple', search_normalize(${tsQuery})) AS q),
        candidates AS (
            SELECT w.id, w.title, w.subtitle, w.first_published_year, w.edition_count, w.search_vector
            FROM works w, q
            WHERE w.search_vector @@ q.q
            LIMIT ${maxCandidates}
        )
        SELECT c.id, c.title, c.subtitle, c.first_published_year
        FROM candidates c, q
        ORDER BY ts_rank(c.search_vector, q.q) DESC, c.edition_count DESC
        LIMIT ${limit};
    `;
}

// For queries that are an author's name rather than a title. Only the first 200 matching
// contributors are considered, so a common first name stays cheap.
export function searchWorksByContributor(tsQuery: string, limit: number) {
    return pg`
        WITH matched AS (
            SELECT c.id FROM contributors c
            WHERE c.search_vector @@ to_tsquery('simple', search_normalize(${tsQuery}))
            LIMIT 200
        )
        SELECT w.id, w.title, w.subtitle, w.first_published_year
        FROM matched m
        JOIN work_contributors wc ON wc.contributor_id = m.id
        JOIN works w ON w.id = wc.work_id
        GROUP BY w.id
        ORDER BY w.edition_count DESC
        LIMIT ${limit};
    `;
}

// Typo-tolerant matches (pg_trgm word similarity, using the trigram indexes) on titles and
// contributor names, most similar first. The threshold is set for this transaction only.
export function searchWorksFuzzy(text: string, threshold: number, limit: number) {
    return pg.begin(async tx => {
        await tx`SELECT set_config('pg_trgm.word_similarity_threshold', ${String(threshold)}, true)`;
        return tx`
            WITH q AS (SELECT search_normalize(${text}) AS q),
            by_title AS (
                SELECT w.id, word_similarity(q.q, search_normalize(w.title)) AS sim
                FROM works w, q
                WHERE q.q <% search_normalize(w.title)
                ORDER BY sim DESC
                LIMIT ${limit}
            ),
            people AS (
                SELECT c.id, word_similarity(q.q, search_normalize(c.name)) AS sim
                FROM contributors c, q
                WHERE q.q <% search_normalize(c.name)
                ORDER BY sim DESC
                LIMIT 20
            ),
            by_contributor AS (
                SELECT wc.work_id AS id, MAX(p.sim) AS sim
                FROM people p JOIN work_contributors wc ON wc.contributor_id = p.id
                GROUP BY wc.work_id
            ),
            matches AS (
                SELECT id, MAX(sim) AS sim
                FROM (SELECT * FROM by_title UNION ALL SELECT * FROM by_contributor) m
                GROUP BY id
            )
            SELECT w.id, w.title, w.subtitle, w.first_published_year
            FROM matches m JOIN works w ON w.id = m.id
            ORDER BY m.sim DESC, w.edition_count DESC
            LIMIT ${limit};
        `;
    });
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
