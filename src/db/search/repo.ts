import { uniqueBy } from '../../utils/general.ts';
import type { SearchResult } from '../../schemas/search.ts';
import { toTsQuery } from './query.ts';
import * as lookups from './sql/lookups.ts';

type Row = Record<string, any>;

// Searches our own catalog: title matches first, then works by matching contributors.
export async function searchCatalog(query: string, limit: number): Promise<SearchResult[]> {
    const text = query.trim();
    const tsQuery = toTsQuery(text);
    if (!tsQuery) return [];

    // Both run at once; contributor matches only fill whatever room the titles leave.
    const [byTitle, byContributor] = await Promise.all([
        lookups.searchWorksByTitle(tsQuery, text, limit),
        lookups.searchWorksByContributor(tsQuery, limit),
    ]);
    const works: Row[] = uniqueBy([...byTitle, ...byContributor], (r: Row) => r.id).slice(0, limit);
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
