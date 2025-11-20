const getBookByWorkId = `
    SELECT b.id, b.title, b.subtitle, b.bio, b.number_of_pages, b.xp, bo.cover_id, bo.work_id
    FROM books b
    JOIN books_ol bo ON bo.books_id = b.id
    WHERE bo.work_id = ?
`

module.exports = {
    getBookByWorkId
};