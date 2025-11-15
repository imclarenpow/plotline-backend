// for cover size validation.
const CoverSizes = { S: "S", M: "M", L: "L" };

// domain names & search parameters to only get the required information.
const DOMAIN = 'openlibrary.org';
const BOOK_COVERS_URL = `https://covers.${DOMAIN}/b/olid`;
const AUTHOR_COVERS_URL = `https://covers.${DOMAIN}/a/id`;
const URL = `https://${DOMAIN}`;
const SEARCH_PARAMS = `key,title,subtitle,first_publish_year,author_key,cover_edition_key,lang:en,subject,number_of_pages_median`;

// headers for all calls.
const userAgent = {
   "User-Agent": "Plotline-App/Testing isaac@plotline.nz" 
};

// === CALL ENDPOINTS ===

async function getWork(workId){
    const res = await fetch(`${URL}/works/${workId}.json`, {headers: userAgent});
    if (!res.ok) throw new Error(`Failed to fetch work ${workId}: ${res.status}`);
    return await res.json();
}

async function getAuthor(authorId){
    const res = await fetch(`${URL}/authors/${authorId}.json`, {headers: userAgent});
    if (!res.ok) throw new Error(`Failed to fetch author ${authorId}: ${res.status}`);
    return await res.json();
}

async function getBookCover(coverId, size){
    if(!Object.values(CoverSizes).includes(size)){
        throw new Error(`Invalid size "${size}". Must be one of: ${Object.values(CoverSizes).join(', ')}`);
    }
    return `${BOOK_COVERS_URL}/${coverId}-${size}`;
}

async function getAuthorCover(coverId, size){
    if(!Object.values(CoverSizes).includes(size)){
        throw new Error(`Invalid size "${size}". Must be one of: ${Object.values(CoverSizes).join(', ')}`);
    }
}

async function search(query, number_returned){
    const res = await fetch(`${URL}/search.json?q=${encodeURIComponent(query)}&fields=${SEARCH_PARAMS}&limit=${number_returned}`);
    if (!res.ok) throw new Error(`Failed to search for ${query}: ${res.status}`);
    return await res.json();
}

module.exports = {
    getCover: getBookCover, getAuthorCover, getWork, getAuthor, search
}