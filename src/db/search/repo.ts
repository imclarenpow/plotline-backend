import { binaryToUuid } from '../utils.ts';
import { uniqueBy } from '../../utils/general.ts';
import type { SearchResult } from '../../schemas/search.ts';
import { toBooleanQuery } from './query.ts';
import * as lookups from './sql/lookups.ts';

type Row = Record<string, any>;

// Searches our own catalog: title matches first, then works by matching contributors.
export async function searchCatalog(query: string, limit: number): Promise<SearchResult[]> {
    const text = query.trim();
    if (!text) return [];
    const booleanQuery = toBooleanQuery(text);

    // Both run at once; contributor matches only fill whatever room the titles leave.
    const [byTitle, byContributor] = booleanQuery
        ? await Promise.all([
            lookups.searchWorksByTitle(booleanQuery, text, limit),
            lookups.searchWorksByContributor(booleanQuery, limit),
        ])
        : [await lookups.searchWorksByExactTitle(text, limit), []];

    const works: Row[] = uniqueBy([...byTitle, ...byContributor], r => binaryToUuid(r.id)).slice(0, limit);
    if (!works.length) return [];

    const ids = works.map(w => w.id as Uint8Array);
    const [names, olids, covers] = await Promise.all([
        lookups.getContributorNamesForWorks(ids),
        lookups.getOpenLibraryIdsForWorks(ids),
        lookups.getCoversForWorks(ids),
    ]);
    const authors = new Map<string, string[]>();
    for (const row of names) {
        const key = binaryToUuid(row.work_id);
        if (!authors.has(key)) authors.set(key, []);
        authors.get(key)!.push(row.name);
    }
    const olidByWork = new Map<string, string>(olids.map((r: Row) => [binaryToUuid(r.work_id), r.external_id]));
    const coverByWork = new Map<string, string>(covers.map((r: Row) => [binaryToUuid(r.work_id), r.cover_url]));

    return works.map(w => {
        const id = binaryToUuid(w.id);
        return {
            id,
            olid: olidByWork.get(id) ?? null,
            title: w.title,
            subtitle: w.subtitle ?? null,
            authors: authors.get(id) ?? [],
            firstPublishedYear: w.first_published_year ?? null,
            coverUrl: coverByWork.get(id) ?? null,
            source: 'catalog' as const,
        };
    });
}
