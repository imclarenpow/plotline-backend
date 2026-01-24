import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, ttl } from "../../../config/redis.ts";

export async function getSearchQuery(query: string): Promise<any | null> {
    console.log('[REDIS] Attempting to retrieve cached search for:', query);
    const key = `${searchPrefix}:${query}`;
    const value = await redis.get(key);

    if (value) {
        console.log('[REDIS] Cache hit for key:', key);
        return JSON.parse(value);
    } else {
        console.log('[REDIS] Cache miss for key:', key);
        return null;
    }
}

export async function getWorksSearchInfo(work: string): Promise<any | null> {
    const key = `${searchWorksPrefix}:${work}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}