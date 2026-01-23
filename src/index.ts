const env = process.env;
//import { testConnection as testMySqlConnection } from './db/mysql';
//import { testConnection as testRedisConnection } from './db/redis';

const server = Bun.serve({
    port: env.BACKEND_PORT,
    routes: {
        //"/api/test/mysql": async () => new Response(await testMySqlConnection()),
        //"/api/test/redis": async () => new Response(await testRedisConnection()),
    }
});

console.log(`Server running on ${server.url}`);