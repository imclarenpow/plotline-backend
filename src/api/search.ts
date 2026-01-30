import { search } from '../services/openlibrary/client.ts';
import { searchItemLimit } from '../config/search.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';
import { setSearchQuery } from '../db/search/redis/mutations.ts';
import { jsonResponse } from '../utils/api.ts';

export async function searchHandler(query: string, limit: number = searchItemLimit) {
    const cachedData = await getSearchQuery(query);

    if (cachedData) {
        return jsonResponse(cachedData);
    } else {
        const searchResults = await search(query, limit);
        await setSearchQuery(query, searchResults);
        return jsonResponse(searchResults);
    }
}