import { getWork } from '../services/openlibrary/client.ts';
import { searchItemLimit } from '../config/search.ts';
import { getWorksSearchInfo } from '../db/search/redis/lookups.ts';
import { setWorksSearchInfo } from '../db/search/redis/mutations.ts';
import { jsonResponse } from '../utils/api.ts';


// TODO: may cause race conditions if multiple requests for the same query come in simultaneously.
// should consider adding a locking mechanism or queue to handle this.
export async function bookWorkHandler(query: string) {
    const cachedData = await getWorksSearchInfo(query);
    console.log(`/api/books/${query} - Cache ${cachedData ? 'hit' : 'miss'}`);
    if (cachedData) {
        return jsonResponse(cachedData);
    } else {
        const searchResults = await getWork(query);
        await setWorksSearchInfo(query, searchResults);
        return jsonResponse(searchResults);
    }
}