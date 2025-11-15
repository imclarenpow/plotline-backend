// -- GET AUTHOR --
const getAuthorByOlid = `
    SELECT a.id, a.name, a.bio, a.birth_date, a.death_date, ao.olauthor_id
    FROM authors a
    JOIN authors_ol ao ON ao.author_id = a.id
    WHERE ao.olauthor_id = ?
`
// get by id
const getAuthorById = `
    SELECT a.id, a.name, a.bio, a.birth_date, a.death_date, ao.olauthor_id
    FROM authors a
    JOIN authors_ol ao ON ao.author_id = a.id
    WHERE a.id = ?
`
// -- AUTHOR BOOKS --
const getAuthorBooksBase = `
    SELECT
        b.id, b.title, b.subtitle, b.bio, b.number_of_pages, b.xp, bo.work_id, bo.cover_id
    FROM books b
    JOIN book_authors ba ON ba.book_id = b.id
    JOIN authors a ON a.id = ba.author_id
    LEFT JOIN books_ol bo ON bo.books_id = b.id
`
// get by id
const getAuthorBooksById = getAuthorBooksBase + `
    WHERE a.id = ?
    ORDER BY b.title
`
// get by name
const getAuthorBooksByName = getAuthorBooksBase + `
    WHERE a.name LIKE = CONCAT('%', ?, '%')
    ORDER BY b.title
`
// get by olid
const getAuthorBooksByOlid = getAuthorBooksBase + `
    JOIN authors_ol ao ON ao.author_id = a.id
    WHERE ao.olauthor_id = ?
    ORDER BY b.title
`

module.exports = {
    getAuthorByOlid, getAuthorBooksById, getAuthorById
};