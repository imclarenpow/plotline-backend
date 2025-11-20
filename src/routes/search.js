// get the queries for books to use later.  
const openlibrary = require('../services/openlibrary');
const PREFIX = '/api/search';

module.exports = async function (fastify, opts) {
    // accepts either /search/example or /search/example?num=25.
    fastify.get(`${PREFIX}/:query`, async (req, reply) => {
        // use query param 'num', default to 10 results.
        const num = parseInt(req.query.num) || 10;

        try {
            const results = await openlibrary.search(req.params.query, num);
            reply.send(results);
        }catch(err){
            reply.code(500).send({ error: err.message});
        }
    });
}
    