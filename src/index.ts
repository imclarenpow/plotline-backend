import { searchHandler } from './api/search.ts';

const env = process.env;
import { testConnection as testMySqlConnection } from './db/bindings/mysql';
import { testConnection as testRedisConnection, redis } from './db/bindings/redis';

async function flushRedis() {
    try {
        await redis.send("FLUSHALL", []);
        return new Response(JSON.stringify({ message: 'Redis cache purged successfully' }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

const server = Bun.serve({
    port: env.BACKEND_PORT,
    routes: {
        "/api/test/mysql": async () => new Response(await testMySqlConnection()),
        "/api/test/redis": async () => new Response(await testRedisConnection()),
        "/api/debug/redis-flush": async () => await flushRedis(),
        "/api/search/:query": async req => {
            try {
                const result = await searchHandler(`${req.params.query}`);
                return result;
            } catch (error: any) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }
    }
});

console.log(`Server running on ${server.url}`);