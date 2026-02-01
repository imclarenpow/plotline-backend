import { search } from '../services/openlibrary/client.ts';
import { searchItemLimit } from '../config/search.ts';
import { getSearchQuery } from '../db/search/redis/lookups.ts';
import { setSearchQuery } from '../db/search/redis/mutations.ts';
import { jsonResponse } from '../utils/api.ts';


// TODO: may cause race conditions if multiple requests for the same query come in simultaneously.
// should consider adding a locking mechanism or queue to handle this.
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