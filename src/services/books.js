const select = require('../queries/select/books');
const insert = require('../queries/insert/books');
const { generateBinaryUuid } = require('./utils/uuid');
const olUtils = require('./utils/openlibrary');
const { query } = require('./db');
const { create } = require('domain');

// -- SELECT --
async function getBookByWorkId(db, work_id) {
    const result = await query(db, select.getBookByWorkId, [work_id]);
    return result[0] || null;
}

async function getBookById(db, id) {
    const result = await query(db, select.getBookById, [id]);
    return result[0] || null;
}

// -- INSERT --
// create the book row which all book tables reference.
async function createBookRow(db, id, title, subtitle, bio, number_of_pages, xp) {
    const result = await query(db, insert.createBook, [id, title, subtitle, bio, number_of_pages, xp]);
    return result[0] || null;
}
// create the book_ol row.
async function createBookOlRow(db, id, work_id, cover_id) {
    const result = await query(db, insert.createBook_Ol, [id, work_id, cover_id]);
    return result[0] || null;
}
// create book_authors row for the book author relationship
async function createBookAuthorRow(db, author_id, book_id) {
    const result = await query(db, insert.createBookAuthor, [author_id, book_id]);
    return result[0] || null;
}
// create row for remote ids of the book.
async function createBookRemoteIdRow(db, id, source, remote_id) {
    const result = await query(db, insert.createBookRemoteId, [id, source, remote_id]);
    return result[0] || null;
}

// create overall book
async function createBookFromOLData(db, bookData, uuid) {
    if (!bookData) throw new Error("No book data provided");
    const processedData = await olUtils.transformBookOLDataToDBFormat(bookData);
    const xp = 0; // this is 0 for now. in the future it we will figure out how to calculate this.
    // create the book row.
    await createBookRow(db, uuid, processedData.title, processedData.subtitle, processedData.bio, processedData.number_of_pages, xp);
    await createBookOlRow(db, uuid, processedData.work_id, processedData.cover_id);
    for (const source in processedData.sources) {
        if (processedData.sources.hasOwnProperty(source)) {
            const remoteIdArray = processedData.sources[source];
            if (Array.isArray(remoteIdArray) && remoteIdArray.length > 0) {
                await createBookRemoteIdRow(db, uuid, source, remoteIdArray[0]);
            }
        }
    }
    return getBookByWorkId(db, processedData.work_id);;
}

module.exports = {
    getBookByWorkId, createBookFromOLData, createBookAuthorRow
};