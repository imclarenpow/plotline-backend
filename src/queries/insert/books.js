// create the id in higher level function and pass it down. avoids multiple db calls.
const createBook = `
    INSERT INTO books (id, title, subtitle, bio, number_of_pages, xp)
    VALUES (?, ?, ?, ?, ?, ?)
`
// seperate in the case where OL is no longer used.
const createBook_Ol = `
    INSERT INTO books_ol (book_id, work_id, cover_id)
    VALUES (?, ?, ?)  
`

const createBookAuthor = `
    INSERT INTO book_authors (author_id, book_id)
    VALUES (?, ?)
`

const createBookRemoteId = `
    INSERT INTO books_remote_ids (book_id, source, remote_id)
    VALUES (?, ?, ?)
`
module.exports = {
    createBook, createBook_Ol, createBookAuthor, createBookRemoteId
}