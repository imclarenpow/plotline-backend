// get the queries for books to use later.
const bookService = require('../services/books');
const authorService = require('../services/authors');
const openlibrary = require('../services/openlibrary');
const { cleanAuthorOlids } = require('../services/utils/openlibrary');
const { generateBinaryUuid } = require('../services/utils/uuid');
const PREFIX = '/api/books';


module.exports = async function (fastify, opts) {
    const db = fastify.mysql;
    fastify.get(`${PREFIX}/olid/:worksOlid`, async (req, reply) => {
        try {
            const bookUUID = await generateBinaryUuid();
            let book = await bookService.getBookByWorkId(db, req.params.worksOlid);
            // if there isn't a book logic.
            if (!book) {
                const bookData = await openlibrary.getWork(req.params.worksOlid);
                const authorOlids = await cleanAuthorOlids(bookData.authors); // "/authors/OL25712A" currently, more if more authors.
                // iterate through list of authors (usually only 1) and add to the author ids list.
                let author_ids = [];
                for (const aOlid of authorOlids) {
                    let author = await authorService.getAuthorByOlid(db, aOlid);
                    if (!author) {
                        const authorUUID = await generateBinaryUuid();
                        const authorData = await openlibrary.getAuthor(aOlid);
                        // i'm pretty sure i still have to add the logic to this line below.
                        author = await authorService.createAuthorFromOLData(db, authorData, authorUUID);
                    }
                    // here we create the book_authors row.
                    author_ids.push(author.id);
                }
                book = await bookService.createBookFromOLData(db, bookData, bookUUID);
                for (const author_id of author_ids) {
                    await bookService.createBookAuthorRow(db, author_id, bookUUID);
                }
                reply.send(book);
            } else {
                reply.send(book);
            }
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
}