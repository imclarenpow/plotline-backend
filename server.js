// Require the framework and instantiate it
require('dotenv').config();
const fastify = require('fastify')({ logger: true })

// DB plugin
fastify.register(require('./plugins/db'));

// Routes
fastify.register(require('./routes/books'));
fastify.register(require('./routes/users'));

// test route
fastify.get('/api/test', (req, reply) => reply.send({ hello: 'world' }));

// Run the server!
fastify.listen({ port: process.env.BACKEND_PORT }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})