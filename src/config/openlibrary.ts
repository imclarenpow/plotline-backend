export type CoverSize = 'S' | 'M' | 'L';

const DOMAIN = 'openlibrary.org';
const BOOK_COVERS_URL = `https://covers.${DOMAIN}/b/olid/`;
// Covers by numeric cover ID, as found in dumps (covers[]) and search results (cover_i).
const BOOK_COVERS_BY_ID_URL = `https://covers.${DOMAIN}/b/id/`;
const AUTHOR_COVERS_URL = `https://covers.${DOMAIN}/a/id/`;
const URL = `https://${DOMAIN}`;
const SEARCH_PARAMS = `key,title,subtitle,first_publish_year,author_key,cover_edition_key,cover_i,author_name,lang:en,subject,number_of_pages_median`;

// e.g. covers[] in the dumps, cover_i in search results.
function bookCoverUrlById(coverId: number, size: CoverSize = 'M'): string {
    return `${BOOK_COVERS_BY_ID_URL}${coverId}-${size}.jpg`;
}

const userAgent = {
    'User-Agent': `${process.env.APP_NAME} ${process.env.APP_EMAIL_CONTACT}`,
}

export {
    DOMAIN, BOOK_COVERS_URL, BOOK_COVERS_BY_ID_URL, bookCoverUrlById, AUTHOR_COVERS_URL, URL, SEARCH_PARAMS, userAgent
}