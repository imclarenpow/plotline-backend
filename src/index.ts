import { resolveWorkHandler, workEditionsHandler, workHandler } from './api/works.ts';
import { searchHandler } from './api/search.ts';
import { errorResponse } from './utils/api.ts';

const env = process.env;
import { testConnection as testPostgresConnection } from './db/bindings/postgres.ts';
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
        "/api/test/postgres": async () => Response.json([...await testPostgresConnection()]),
        "/api/test/redis": async () => new Response(await testRedisConnection()),
        "/api/debug/redis-flush": async () => await flushRedis(),
        "/api/search/:query": async req => {
            try {
                return await searchHandler(req.params.query);
            } catch (error) {
                return errorResponse(error);
            }
        },
        "/api/works/resolve/:source/:externalId": async req => {
            try {
                return await resolveWorkHandler(req.params.source, req.params.externalId);
            } catch (error) {
                return errorResponse(error);
            }
        },
        "/api/works/:id": async req => {
            try {
                return await workHandler(req.params.id);
            } catch (error) {
                return errorResponse(error);
            }
        },
        "/api/works/:id/editions": async req => {
            try {
                return await workEditionsHandler(req.params.id);
            } catch (error) {
                return errorResponse(error);
            }
        }
    }
});

console.log(`Server running on ${server.url}`);
