const search_prefix = 'search';
const search_works_prefix = 'work';
const ttl = 24 * 60 * 60; // 24 hrs in seconds
const ol_utils = require('./utils/openlibrary');

// Put Search Query in Redis db as key "search:query" with the OpenLibrary payload.
async function setSearchQuery(redis, query, payload) {
    const key = `${search_prefix}:${query}`;
    const value = JSON.stringify(payload);
    await redis.set(key, value);
    await redis.expire(key, ttl);
    await setWorksSearchInfo(redis, payload);
}
// Get Search Key from Redis db when searching API to remove payload.
async function getSearchQuery(redis, query) {
    const key = `${search_prefix}:${query}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}
// Set works from Search Query in Redis db as key "work:OLID" with the OpenLibrary doc payload.
async function setWorksSearchInfo(redis, payload) {
    for (const doc of payload.docs) {
        const work = await ol_utils.cleanWorkOlid(doc.key);
        if (await getWorksSearchInfo(redis, work) === null) {
            const key = `${search_works_prefix}:${work}`;
            const value = JSON.stringify(doc);
            await redis.set(key, value);
            await redis.expire(key, ttl);
        }
    }
}
// Get works by olid.
async function getWorksSearchInfo(redis, work) {
    const key = `${search_works_prefix}:${work}`;
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
}

module.exports = {
    setSearchQuery, getSearchQuery, getWorksSearchInfo
}