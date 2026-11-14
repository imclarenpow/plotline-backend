// v2: SearchResponse ({ query, results }). Bump when the cached shape changes, so old
// entries are never served in the new format.
const searchPrefix = 'search:v2';
const searchWorksPrefix = 'work';
const searchEditionsPrefix = 'edition';
const ttl = 24 * 60 * 60; // 24 hrs in seconds

export {
    searchPrefix, searchWorksPrefix, searchEditionsPrefix, ttl
}