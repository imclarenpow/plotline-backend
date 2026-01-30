import * as utils from '../../utils/general.ts';
import { ttl } from '../../config/redis.ts';
import * as redisLookup from '../../db/search/redis/lookups.ts';
import * as redisMutations from '../../db/search/redis/mutations.ts';

export async function transformBookOLDataToDBFormat(bookData: any): Promise<any> {
    if (!bookData) throw new Error("No book data provided");
    return {
        title: await utils.cleanString(bookData.title) || null,
        bio: await utils.cleanString(bookData.description) || null,
        number_of_pages: bookData.number_of_pages || 0,
        work_id: await cleanWorkOlid(bookData.key) || null,
        cover_id: bookData.covers?.[0] || null,
        sources: bookData.identifiers || {}
    }
}

export async function cleanWorkOlid(raw: string): Promise<string> {
    return raw.replace(/^\/works\//, '');
}

export async function processSearchResults(payload: any): Promise<void> {
    for (const doc of payload.docs) {
        const work = await cleanWorkOlid(doc.key);
        const existingInfo = await redisLookup.getWorksSearchInfo(`${work}`);

        if (!existingInfo) {
            redisMutations.setWorksSearchInfo(`${work}`, await transformBookOLDataToDBFormat(doc));
        }
    }
}