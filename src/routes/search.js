// get the queries for books to use later.  
const openlibrary = require('../services/openlibrary');
const search = require('../services/search');
const PREFIX = '/api/search';

module.exports = async function (fastify, opts) {
    // accepts either /search/example or /search/example?num=25.
    fastify.get(`${PREFIX}/:query`, async (req, reply) => {
        // use query param 'num', default to 10 results.
        const redis = fastify.redis;
        const num = parseInt(req.query.num) || 10;
        const redisResult = await search.getSearchQuery(redis, req.params.query)
        if (redisResult) {
            console.log("redis hit");
            return reply.send(redisResult);
        } else {
            console.log("redis miss");
            try {
                const results = await openlibrary.search(req.params.query, num);
                await search.setSearchQuery(redis, req.params.query, results);
                reply.send(results);
            } catch (err) {
                reply.code(500).send({ error: err.message });
            }
        }
    });
}
