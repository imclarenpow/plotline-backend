import { search } from '../services/openlibrary/client.ts';
import { toSearchResults } from '../services/openlibrary/utils.ts';
import { minCatalogResults, searchItemLimit } from '../config/search.ts';
import { searchCatalog } from '../db/search/repo.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';
import { setSearchQuery } from '../db/search/redis/mutations.ts';
import type { SearchResponse, SearchResult } from '../schemas/search.ts';
import { jsonResponse } from '../utils/api.ts';

// Searches our catalog first. Only when it finds fewer than minCatalogResults does it ask
// OpenLibrary, so most searches never leave our own database.
// TODO: may cause race conditions if multiple requests for the same query come in simultaneously.
// should consider adding a locking mechanism or queue to handle this.
export async function searchHandler(query: string, limit: number = searchItemLimit) {
    const cachedData = await getSearchQuery(query);
    console.log(`/api/search/${query} - Cache ${cachedData ? 'hit' : 'miss'}`);
    if (cachedData) return jsonResponse(cachedData);

    // If either source fails, answer from the other one, and don't cache that partial answer.
    let complete = true;
    let results: SearchResult[] = [];
    let catalogError: unknown = null;
    try {
        results = await searchCatalog(query, limit);
    } catch (error) {
        catalogError = error;
        complete = false;
        console.error(`/api/search/${query} - catalog search failed:`, error);
    }
    if (results.length < minCatalogResults) {
        try {
            results = mergeResults(results, toSearchResults(await search(query, limit)), limit);
        } catch (error) {
            if (catalogError || !results.length) throw error;
            complete = false;
            console.error(`/api/search/${query} - OpenLibrary fallback failed:`, error);
        }
    }

    const payload: SearchResponse = { query, results };
    if (complete) await setSearchQuery(query, payload);
    return jsonResponse(payload);
}

// Catalog results first; OpenLibrary results for works the catalog already returned are dropped.
export function mergeResults(catalog: SearchResult[], openLibrary: SearchResult[], limit: number): SearchResult[] {
    const seen = new Set(catalog.map(r => r.olid).filter(Boolean));
    return [...catalog, ...openLibrary.filter(r => !r.olid || !seen.has(r.olid))].slice(0, limit);
}
