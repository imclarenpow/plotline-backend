// Require the framework and instantiate it
require('dotenv').config();
const fastify = require('fastify')({ logger: true })

// DB plugin
fastify.register(require('./src/plugins/mysql'));
fastify.register(require('./src/plugins/redis'));

// Routes
fastify.register(require('./src/routes/books'));
fastify.register(require('./src/routes/users'));
fastify.register(require('./src/routes/search'));

// test route
fastify.get('/api/test', (req, reply) => reply.send({ hello: 'world' }));

// Run the server!
fastify.listen({ port: process.env.BACKEND_PORT }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});