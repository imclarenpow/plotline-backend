import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, ttl } from "../../../config/redis.ts";
import * as ol from '../../../services/openlibrary/utils.ts';

export async function setSearchQuery(query: string, payload: any) {
    console.log('[REDIS] Caching search query:', query);
    const key = `${searchPrefix}:${query}`;
    const value = JSON.stringify(payload);

    try {
        await redis.set(key, value);
        console.log('[REDIS] Set key:', key);

        await redis.expire(key, ttl);
        console.log('[REDIS] Set expiration (TTL):', ttl, 'seconds');

        await ol.processSearchResults(payload);
        console.log('[REDIS] Processed search results successfully');
    } catch (error) {
        console.error('[REDIS] Error caching search query:', error);
        throw error;
    }
}

export async function setWorksSearchInfo(work: string, payload: any) {
    console.log('[REDIS] Caching works search info for work:', work);
    const key = `${searchWorksPrefix}:${work}`;
    const value = JSON.stringify(payload);

    try {
        await redis.set(key, value);
        console.log('[REDIS] Set key:', key);

        await redis.expire(key, ttl);
        console.log('[REDIS] Set expiration (TTL):', ttl, 'seconds');
    } catch (error) {
        console.error('[REDIS] Error caching works search info:', error);
        throw error;
    }
}