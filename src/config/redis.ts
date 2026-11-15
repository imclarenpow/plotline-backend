// v3: search results carry `ref` (a source and its ID) instead of `olid`. Bump when the
// cached shape changes, so old entries are never served in the new format.
const searchPrefix = 'search:v3';
const ttl = 24 * 60 * 60; // 24 hrs in seconds

export {
    searchPrefix, ttl
}
