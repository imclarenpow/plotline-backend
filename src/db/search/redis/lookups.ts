import { redis } from "../../bindings/redis.ts";
import { searchPrefix, ttl } from "../../../config/redis.ts";

async function getCachedSearchPayload<T>(
    prefix: string,
    keyPart: string,
    errorContext: string,
): Promise<T | null> {
    const key = `${prefix}:${keyPart}`;
    const value = await redis.get(key);
    if (value) {
        try {
            return JSON.parse(value) as T;
        } catch (e) {
            try {
                await redis.del(key);
            } catch (delError) {
                console.error('[REDIS] Error deleting corrupted cache entry:', delError);
            }
            console.error(`[REDIS] Error parsing cached ${errorContext}:`, e);
            return null;
        }
    } else {
        return null;
    }
}


export async function getSearchQuery(query: string): Promise<any | null> {
    return await getCachedSearchPayload(searchPrefix, query, "search query");
}
