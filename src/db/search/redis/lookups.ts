import { redis } from "../../bindings/redis.ts";
import { searchPrefix, searchWorksPrefix, ttl } from "../../../config/redis.ts";

export async function getSearchQuery(query: string): Promise<any | null> {
    const key = `${searchPrefix}:${query}`;
    const value = await redis.get(key);
    if (value) {
        return JSON.parse(value);
    } else {
        return null;
    }
}

export async function getWorksSearchInfo(work: string): Promise<any | null> {
    const key = `${searchWorksPrefix}:${work}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}