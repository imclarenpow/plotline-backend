// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
require('dotenv').config();

fastify.register(require('@fastify/mysql'), {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
// quick test for user
fastify.get('/user/:username', function(req, reply){
  fastify.mysql.query(
      'SELECT username, name, email FROM users WHERE username = ?', [req.params.username],
      function onResult (err, result) {
          reply.send(err || result);
      }
  )
});

fastify.get('/api/getBookByOlid/:olid', function(req, reply){
  fastify.mysql.query(
    `SELECT title,
      bio,
      subtitle,
      number_of_pages,
      xp
    FROM books
    WHERE id = (
      SELECT books_id
      FROM books_ol
      WHERE work_id = ?
    )`, [req.params.olid],
    function onResult (err, result) {
      reply.send(err || result);
    }
  )
});

// Declare a route
fastify.get('/', function handler (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})