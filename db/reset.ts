// Drops and recreates the dev database from db/creation, then loads dummy data.
// Runs the SQL through the mysql client inside the plotline-mysql container, as root
// (the root password is read from the container's own environment).
//
//   bun run db:reset              # schema + seeds + dummy data
//   bun run db:reset --no-dummy   # schema + seeds only
//
// DOCKER_CONTEXT selects the Docker host (default: plotline-host).
import { $ } from "bun";
import { join } from "node:path";

const { MYSQL_DB_NAME, MYSQL_USER } = process.env;
const dockerContext = process.env.DOCKER_CONTEXT ?? "plotline-host";
const container = "plotline-mysql";

// Order matters: lookups before the tables that reference them.
const schemaFiles = [
    "creation/01-lookup-tables.sql",
    "creation/02-catalog-tables.sql",
    "creation/03-source-tables.sql",
    "creation/04-user-tables.sql",
    "creation/05-reading-tables.sql",
    "creation/inserts/01-lookups.sql",
    "creation/inserts/xp-values/insert-cat-xp-lookup.sql",
    "creation/inserts/xp-values/insert-subjects-xp.sql",
];
const dummyFiles = [
    "dummy-data/dummy-user.sql",
    "dummy-data/diary-of-a-wimpy-kid.sql",
];

if (!MYSQL_DB_NAME || !MYSQL_USER) {
    throw new Error("MYSQL_DB_NAME and MYSQL_USER must be set (see .env)");
}
if (!/^[A-Za-z0-9_]+_dev$/.test(MYSQL_DB_NAME)) {
    throw new Error(`Refusing to reset '${MYSQL_DB_NAME}': only databases ending in _dev can be reset.`);
}

const files = process.argv.includes("--no-dummy") ? schemaFiles : [...schemaFiles, ...dummyFiles];
const scripts = await Promise.all(files.map(f => Bun.file(join(import.meta.dir, f)).text()));

const sql = [
    `DROP DATABASE IF EXISTS \`${MYSQL_DB_NAME}\`;`,
    `CREATE DATABASE \`${MYSQL_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`,
    `GRANT ALL PRIVILEGES ON \`${MYSQL_DB_NAME}\`.* TO '${MYSQL_USER}'@'%';`,
    `USE \`${MYSQL_DB_NAME}\`;`,
    ...scripts,
].join("\n");

console.log(`Resetting ${MYSQL_DB_NAME} on ${dockerContext}/${container} (${files.length} files)...`);
const rootLogin = 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD"';
await $`docker --context ${dockerContext} exec -i ${container} sh -c ${rootLogin} < ${new Response(sql)}`;
console.log(`Done. ${MYSQL_DB_NAME} is ready.`);
