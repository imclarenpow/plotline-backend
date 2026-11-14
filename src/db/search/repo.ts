import { fuzzyMinLength, fuzzyThreshold, maxRankedCandidates } from '../../config/search.ts';
import { uniqueBy } from '../../utils/general.ts';
import type { SearchResult } from '../../schemas/search.ts';
import { searchWords, toTsQuery } from './query.ts';
import * as lookups from './sql/lookups.ts';

type Row = Record<string, any>;

// Searches our own catalog, best matches first:
//   1. exact titles  2. full-text title matches  3. works by matching contributors
//   4. typo-tolerant matches, only when 1-3 found nothing (see fuzzyMinLength)
export async function searchCatalog(query: string, limit: number): Promise<SearchResult[]> {
    const text = query.trim();
    const tsQuery = toTsQuery(text);
    if (!tsQuery) return [];

    const [exact, byTitle, byContributor] = await Promise.all([
        lookups.searchWorksByExactTitle(text, limit),
        lookups.searchWorksByTitle(tsQuery, limit, maxRankedCandidates),
        lookups.searchWorksByContributor(tsQuery, limit),
    ]);
    let works: Row[] = uniqueBy([...exact, ...byTitle, ...byContributor], (r: Row) => r.id);
    if (!works.length && searchWords(text).join('').length >= fuzzyMinLength) {
        works = [...await lookups.searchWorksFuzzy(text, fuzzyThreshold, limit)];
    }
    works = works.slice(0, limit);
    if (!works.length) return [];

    const ids = works.map(w => w.id as string);
    const [names, olids, covers] = await Promise.all([
        lookups.getContributorNamesForWorks(ids),
        lookups.getOpenLibraryIdsForWorks(ids),
        lookups.getCoversForWorks(ids),
    ]);
    const authors = new Map<string, string[]>();
    for (const row of names) {
        if (!authors.has(row.work_id)) authors.set(row.work_id, []);
        authors.get(row.work_id)!.push(row.name);
    }
    const olidByWork = new Map<string, string>(olids.map((r: Row) => [r.work_id, r.external_id]));
    const coverByWork = new Map<string, string>(covers.map((r: Row) => [r.work_id, r.cover_url]));

    return works.map(w => ({
        id: w.id,
        olid: olidByWork.get(w.id) ?? null,
        title: w.title,
        subtitle: w.subtitle ?? null,
        authors: authors.get(w.id) ?? [],
        firstPublishedYear: w.first_published_year ?? null,
        coverUrl: coverByWork.get(w.id) ?? null,
        source: 'catalog' as const,
    }));
}
