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
    try {
        await redis.set(key, value);
        await redis.expire(key, ttl);
    } catch (error) {
        console.error(`[REDIS] Error caching works search info. Removing key ${key}`, error);
        // try catch in the case redis is just down
        try {
            await redis.del(key);
        } catch (delError) {
            console.error(`[REDIS] Error deleting key ${key} after failed setWorksSearchInfo. Maybe unreachable?`, delError);
        }

        throw error;
    }
}