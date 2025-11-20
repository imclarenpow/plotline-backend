// need to return the id when inserting a line.
const createAuthor = `
    INSERT INTO authors (id, name, bio, birth_date, death_date)
    VALUES (?, ?, ?, ?, ?)
`
// seperate in the case where OL is no longer used.
const createAuthor_Ol = `
    INSERT INTO authors_ol (author_id, olauthor_id, cover_id)
    VALUES (?, ?, ?)
`

const createAuthorRemoteId = `
    INSERT INTO authors_remote_ids (author_id, source, remote_id)
    VALUES (?, ?, ?)
`
module.exports = {
    createAuthor, createAuthorRemoteId, createAuthor_Ol
};