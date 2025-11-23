// get the queries for books to use later.
const authorService = require('../services/authors');
const openlibrary = require('../services/openlibrary');
const PREFIX = '/api/authors';

module.exports = async function (fastify, opts) {
    // get Author record by olid.
    fastify.get(`${PREFIX}/olid/:authorOlid`, async (req, reply) => {
        try {
            const author = await authorService.getAuthorByOlid(fastify.mysql, req.params.authorOlid);
            reply.send(author);
        } catch (err) {
            reply.code(500).send({ error: err.message });
        }
    });
}