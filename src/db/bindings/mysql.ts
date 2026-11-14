import { SQL } from "bun";
const { MYSQL_USER, MYSQL_PASSWORD, DB_HOST, MYSQL_PORT, MYSQL_DB_NAME, MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL } = process.env;

const connectionString = `mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${DB_HOST}:${MYSQL_PORT}/${MYSQL_DB_NAME}`

// MySQL 8.4's caching_sha2_password needs TLS or the server's RSA public key for the first
// login after a server restart. Dev only: set MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL=1 on a trusted
// LAN. Never in production, where the key exchange could be intercepted (see docs/infrastructure.md).
const mysql = new SQL(connectionString, {
    allowPublicKeyRetrieval: MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL === '1',
});

async function testConnection() {
    const result = await mysql`SELECT 1 AS ok`;
    return result;
}

export {
    mysql, testConnection
};
