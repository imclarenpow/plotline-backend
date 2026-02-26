import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, ttl } from "../../../config/redis.ts";

export async function getSearchQuery(query: string): Promise<any | null> {
    const key = `${searchPrefix}:${query}`;
    const value = await redis.get(key);
    if (value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            try {
                await redis.del(key); // remove corrupted cache entry
            } catch (delError) {
                console.error('[REDIS] Error deleting corrupted cache entry:', delError);
            }
            console.error('[REDIS] Error parsing cached search query:', e);
            return null;
        }
    } else {
        return null;
    }
}

export async function getWorksSearchInfo(work: string): Promise<any | null> {
    const key = `${searchWorksPrefix}:${work}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}