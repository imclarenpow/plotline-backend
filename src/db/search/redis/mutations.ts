import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, searchEditionsPrefix, ttl } from "../../../config/redis.ts";

async function setCachedSearchPayload<T>(
    prefix: string,
    keyPart: string,
    payload: T,
    errorContext: string,
) {
    const key = `${prefix}:${keyPart}`;
    const value = JSON.stringify(payload);
    try {
        await redis.set(key, value);
        await redis.expire(key, ttl);
    } catch (error) {
        console.error(`[REDIS] Error ${errorContext} for key ${key}`, error);
        throw error;
    }
}

export async function setSearchQuery(query: string, payload: any) {
    await setCachedSearchPayload(searchPrefix, query, payload, "caching search query");
}

export async function setWorksSearchInfo(work: string, payload: any) {
    await setCachedSearchPayload(searchWorksPrefix, work, payload, "caching works search info");
}

export async function setEditionsSearchInfo(work: string, payload: any) {
    await setCachedSearchPayload(searchEditionsPrefix, work, payload, "caching editions search info");
}