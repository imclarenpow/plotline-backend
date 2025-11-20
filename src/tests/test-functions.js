const { createAuthorFromOLData } = require("../services/authors");
const { createBookFromOLData } = require("../services/books");
const bookService = require('../services/books');
const { getAuthorByOlid } = require('../services/authors');
const openlibrary = require('../services/openlibrary');
const { cleanAuthorOlids } = require('../services/utils/openlibrary');
const authorData = require("./author-jk-rowling.json");
const bookData = require("./book-the-recruit.json");
const test = require("node:test");
const { generateBinaryUuid } = require("../services/utils/uuid");

// mock database object
const mockDb = {
    query(sql, params, cb) {
        console.log('MOCK SQL:', sql, params);
        cb(null, { insertId: 1, affectedRows: 1 });
    }
};
// load samples.

// test createAuthorFromOLData function from author service.
async function testCreateAuthorFromOLData(db, authorData) {
    try {
        console.log("Starting function test of createAuthorFromOLData (mock db)...");
        const result = await createAuthorFromOLData(db, authorData);
        console.log("Result:", result);
    } catch (err) {
        console.error("Error:", err);
    }
}

async function testCreateBookFromOLData(db, bookData) {
    try {
        console.log("Starting function test of createBookFromOLData (mock db)...");
        const result = await createBookFromOLData(db, bookData);
        console.log("Result:", result);
    } catch (err) {
        console.error("Error:", err);
    }
}

async function testBookCreationByOlid(db, worksOlid) {
    try {
        // we create the uuid here so we can create the author relationships before creating the book.
        // this stops us from having to make an additional db call.
        const bookUUID = await generateBinaryUuid();
        let book = await bookService.getBookByWorkId(db, worksOlid);
        // if there isn't a book logic.
        if (!book) {
            const bookData = await openlibrary.getWork(worksOlid);
            const authorOlids = await cleanAuthorOlids(bookData.authors); // "/authors/OL25712A" currently, more if more authors.
            // iterate through list of authors (usually only 1) and add to the author ids list.
            for (const aOlid of authorOlids) {

                let author = await getAuthorByOlid(db, aOlid);

                // we don't need to log if we've created the author because we're adding a relationship for all of them to the book regardless.
                if (!author) {
                    const authorUUID = await generateBinaryUuid();
                    const authorData = await openlibrary.getAuthor(aOlid);
                    author = await createAuthorFromOLData(db, authorData, authorUUID);
                }
                console.log("Author OLID:", aOlid, "Author:", author);
                // here we create the book_authors row.
                await bookService.createBookAuthorRow(db, author.id, bookUUID);
            }
            // book logic here.
            book = await bookService.createBookFromOLData(db, bookData, bookUUID);
            console.log("Created Book:", book);
        } else {
            console.log("Book already exists:", book);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

// testCreateAuthorFromOLData(mockDb, authorData);
// testCreateBookFromOLData(mockDb, bookData);

testBookCreationByOlid(mockDb, "OL453735W");