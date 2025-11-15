const select = require('../queries/select/authors');
const insert = require('../queries/insert/authors');
const { generateBinaryUuid } = require('./utils/uuid');
const olUtils = require('./utils/openlibrary');
const { query } = require('./db');

// -- SELECT --
async function getAuthorByOlid(db, author_olid) {
    const result = await query(db, select.getAuthorByOlid, [author_olid]);
    return result[0] || null;
}
// get author books by author id
async function getAuthorById(db, author_id) {
    const result = await query(db, select.getAuthorById, [author_id]);
    return result[0] || null;
}

async function getAuthorBooksById(db, author_id) {
    const result = await query(db, select.getAuthorBooksById, [author_id]);
    return result[0] || null;
}

// -- INSERT --
async function createAuthorRow(db, id, name, bio, birth_date, death_date) {
    const result = await query(db, insert.createAuthor, [id, name, bio, birth_date, death_date]);
    return result[0] || null;
}

async function createAuthorOlRow(db, author_id, olid, cover_id) {
    const result = await query(db, insert.createAuthor_Ol, [author_id, olid, cover_id]);
    return result[0] || null;
}

async function createAuthorRemoteIdRow(db, author_id, source, remote_id) {
    const result = await query(db, insert.createAuthorRemoteId, [author_id, source, remote_id]);
    return result[0] || null;
}

async function createAuthorFromOLData(db, authorData, uuid) {
    if (!authorData) throw new Error("No author data provided");
    const processedData = await olUtils.transformAuthorOLDataToDBFormat(authorData);
    createAuthorRow(db, uuid, processedData.name, processedData.bio, processedData.birth_date, processedData.death_date);
    createAuthorOlRow(db, uuid, processedData.olid, processedData.cover_id);

    for (const remote_id in processedData.remote_ids) {
        await createAuthorRemoteIdRow(db, uuid, remote_id, processedData.remote_ids[remote_id]);
    }
    return getAuthorById(db, uuid);
}

module.exports = {
    getAuthorByOlid, getAuthorBooksById, createAuthorRow, createAuthorOlRow, createAuthorFromOLData
};