import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, ttl } from "../../../config/redis.ts";
import * as ol from '../../../services/openlibrary/utils.ts';

export async function setSearchQuery(query: string, payload: any) {
    const key = `${searchPrefix}:${query}`;
    const value = JSON.stringify(payload);
    try {
        await redis.set(key, value);
        await redis.expire(key, ttl);
        await ol.processSearchResults(payload);
    } catch (error) {
        throw error;
    }
}

export async function setWorksSearchInfo(work: string, payload: any) {
    const key = `${searchWorksPrefix}:${work}`;
    const value = JSON.stringify(payload);
    console.log('[REDIS] Caching works value:', value);
    console.log('[REDIS] Value prior to stringify:', payload);
    // TODO: Fix the value so that it is properly set in redis.
    try {
        await redis.set(key, value);
        await redis.expire(key, ttl);
    } catch (error) {
        console.error('[REDIS] Error caching works search info:', error);
        throw error;
    }
}