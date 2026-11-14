// Drops and recreates the dev database from db/creation, then loads dummy data.
// Runs the SQL through psql inside the plotline-postgres container, as the container's
// superuser (POSTGRES_USER, read from the container's own environment).
//
//   bun run db:reset              # schema + seeds + dummy data
//   bun run db:reset --no-dummy   # schema + seeds only
//
// DOCKER_CONTEXT selects the Docker host (default: plotline-host).
import { $ } from "bun";
import { join } from "node:path";

const { POSTGRES_DB_NAME } = process.env;
const dockerContext = process.env.DOCKER_CONTEXT ?? "plotline-host";
const container = "plotline-postgres";

// Order matters: extensions and lookups before the tables that reference them.
const schemaFiles = [
    "creation/00-extensions.sql",
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

if (!POSTGRES_DB_NAME) {
    throw new Error("POSTGRES_DB_NAME must be set (see .env)");
}
if (!/^[A-Za-z0-9_]+_dev$/.test(POSTGRES_DB_NAME)) {
    throw new Error(`Refusing to reset '${POSTGRES_DB_NAME}': only databases ending in _dev can be reset.`);
}

const files = process.argv.includes("--no-dummy") ? schemaFiles : [...schemaFiles, ...dummyFiles];
const scripts = await Promise.all(files.map(f => Bun.file(join(import.meta.dir, f)).text()));

// DROP/CREATE DATABASE can't run inside a transaction, so psql runs each statement on its
// own; ON_ERROR_STOP aborts on the first error.
const sql = [
    `DROP DATABASE IF EXISTS "${POSTGRES_DB_NAME}" WITH (FORCE);`,
    `CREATE DATABASE "${POSTGRES_DB_NAME}";`,
    `\\connect "${POSTGRES_DB_NAME}"`,
    ...scripts,
].join("\n");

console.log(`Resetting ${POSTGRES_DB_NAME} on ${dockerContext}/${container} (${files.length} files)...`);
const psql = 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres';
await $`docker --context ${dockerContext} exec -i ${container} sh -c ${psql} < ${new Response(sql)}`;
console.log(`Done. ${POSTGRES_DB_NAME} is ready.`);
