const fp = require('fastify-plugin');

module.exports = fp(async function (fastify, opts) {
    fastify.register(require('@fastify/mysql'), {
        host: process.env.DB_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB_NAME
    });
    fastify.register(require('@fastify/redis'), {
        host: process.env.DB_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD
    });
});
