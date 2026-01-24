import { redis, RedisClient } from "bun";
const { REDIS_PASSWORD, DB_HOST, REDIS_PORT } = process.env;

const connectionString = `redis://:${REDIS_PASSWORD}@${DB_HOST}:${REDIS_PORT}`;

const client = new RedisClient(connectionString);

async function testConnection() {
    const pong = await client.ping();
    return pong;
}

export {
    testConnection, client as redis
};