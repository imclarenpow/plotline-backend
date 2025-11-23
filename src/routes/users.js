//
module.exports = async function (fastify, opts) {
    fastify.get('/api/getUser/:username', function (req, reply) {
        fastify.mysql.query(
            'SELECT username, name, email FROM users WHERE username = ?', [req.params.username],
            function onResult(err, result) {
                reply.send(err || result);
            }
        )
    });
}