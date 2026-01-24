import { search } from '../services/openlibrary/client.ts';
import { searchItemLimit } from '../config/search.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';
import { setSearchQuery } from '../db/search/redis/mutations.ts';
import { jsonResponse } from '../utils/api.ts';

export async function searchHandler(query: string, limit: number = searchItemLimit) {
    console.log('[SEARCH] Handler called with query:', query, 'limit:', limit);

    console.log('[SEARCH] Checking cache for query:', query);
    const cachedData = await getSearchQuery(query);

    if (cachedData) {
        console.log('[SEARCH] Cache hit for query:', query);
        console.log('[SEARCH] Returning cached data');
        return jsonResponse(cachedData);
    } else {
        console.log('[SEARCH] Cache miss for query:', query, '- fetching from OpenLibrary');
        const searchResults = await search(query, limit);
        console.log('[SEARCH] OpenLibrary API returned', searchResults?.docs?.length || 0, 'results');

        console.log('[SEARCH] Caching results for query:', query);
        await setSearchQuery(query, searchResults);
        console.log('[SEARCH] Results cached successfully');

        return jsonResponse(searchResults);
    }
}