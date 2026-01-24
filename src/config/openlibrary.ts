export type CoverSize = 'S' | 'M' | 'L';

const DOMAIN = 'openlibrary.org';
const BOOK_COVERS_URL = `https://covers.${DOMAIN}/b/olid/`;
const AUTHOR_COVERS_URL = `https://covers.${DOMAIN}/a/id/`;
const URL = `https://${DOMAIN}`;
const SEARCH_PARAMS = `key,title,subtitle,first_publish_year,author_key,cover_edition_key,lang:en,subject,number_of_pages_median`;

const userAgent = {
    'User-Agent': `${process.env.APP_NAME} ${process.env.APP_EMAIL_CONTACT}`,
}

export {
    DOMAIN, BOOK_COVERS_URL, AUTHOR_COVERS_URL, URL, SEARCH_PARAMS, userAgent
}