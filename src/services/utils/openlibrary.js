const utils = require('./general');

// clean author olids from /books api. as they start with authors and we don't want that. 
// can be reused to replace /authors/
async function cleanAuthorOlid(raw) {
    return raw.replace(/^\/authors\//, '');
}

async function cleanWorkOlid(raw) {
    return raw.replace(/^\/works\//, '');
}

async function transformBookOLDataToDBFormat(bookData) {
    if (!bookData) throw new Error("No book data provided");
    return {
        title: await utils.cleanString(bookData.title) || null,
        bio: await utils.cleanString(bookData.description) || null,
        number_of_pages: bookData.number_of_pages || 0,
        work_id: await cleanWorkOlid(bookData.key) || null,
        cover_id: bookData.covers[0] || null,
        sources: bookData.identifiers || {}
    }
}

async function transformAuthorOLDataToDBFormat(authorData) {
    if (!authorData) throw new Error("No author data provided");
    // This will return cleaned and transformed author data.
    // In the future, we can review if this needs to be more strict or complex.
    return {
        name: await utils.cleanString(authorData.name) || null,
        bio: await utils.cleanString(authorData.bio.value) || null,
        birth_date: await utils.parseToSqlDate(authorData.birth_date) || null,
        death_date: await utils.parseToSqlDate(authorData.death_date) || null,
        olid: await cleanAuthorOlid(authorData.key) || null,
        cover_id: authorData.photos[0] || null,
        remote_ids: authorData.remote_ids || {}
    }
}
/* Input will look like:
[
    {
      "author": {
        "key": "/authors/OL25712A"
      },
      "type": {
        "key": "/type/author_role"
      }
    }
  ]
*/
async function cleanAuthorOlids(authorArray) {
    let cleanedOlids = [];
    for (const authorObj of authorArray) {
        cleanedOlids.push(await cleanAuthorOlid(authorObj.author.key));
    }
    return cleanedOlids;
}

module.exports = {
    cleanAuthorOlid, transformAuthorOLDataToDBFormat, transformBookOLDataToDBFormat, cleanAuthorOlids, cleanWorkOlid
};