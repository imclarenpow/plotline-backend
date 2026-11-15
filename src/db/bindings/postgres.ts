import { SQL } from "bun";
const { POSTGRES_USER, POSTGRES_PASSWORD, DB_HOST, POSTGRES_PORT, POSTGRES_DB_NAME } = process.env;

const connectionString = `postgres://${POSTGRES_USER}:${encodeURIComponent(POSTGRES_PASSWORD ?? '')}@${DB_HOST}:${POSTGRES_PORT}/${POSTGRES_DB_NAME}`;

// Notes on Bun's Postgres client that the SQL modules rely on:
// - jsonb columns take plain objects; a JSON.stringify'd string would be stored as a JSON string
// - `IN ${pg(array)}` expands arrays (including UUIDs); helpers only work in INSERT/UPDATE/IN
// - result.count is the number of rows affected
// - bigint and count(*) come back as strings; DATE as a UTC Date, so select dates as ::text
const pg = new SQL(connectionString);

async function testConnection() {
    const result = await pg`SELECT 1 AS ok`;
    return result;
}

export {
    pg, testConnection
};
