import { searchHandler } from './api/search.ts';

const env = process.env;
import { testConnection as testMySqlConnection } from './db/bindings/mysql';
import { testConnection as testRedisConnection } from './db/bindings/redis';

const server = Bun.serve({
    port: env.BACKEND_PORT,
    routes: {
        "/api/test/mysql": async () => new Response(await testMySqlConnection()),
        "/api/test/redis": async () => new Response(await testRedisConnection()),
        "/api/search/:query": async req => {
            console.log('[API] /api/search endpoint called');
            console.log('[API] Query parameter:', req.params.query);
            try {
                const result = await searchHandler(`${req.params.query}`);
                console.log('[API] Search handler completed successfully');
                return result;
            } catch (error: any) {
                console.error('[API] Search handler error:', error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }
    }
});

console.log(`Server running on ${server.url}`);