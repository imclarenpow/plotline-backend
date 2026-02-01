import { sql, SQL } from "bun";
const { MYSQL_USER, MYSQL_PASSWORD, DB_HOST, MYSQL_PORT, MYSQL_DB_NAME } = process.env;

const connectionString = `mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${DB_HOST}:${MYSQL_PORT}/${MYSQL_DB_NAME}`

const mysql = new SQL(connectionString);

async function testConnection() {
    const result = await mysql`SELECT number_of_pages FROM books WHERE title = 'Diary of a Wimpy Kid'`;
    return result;
}

export {
    mysql, testConnection
};