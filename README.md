# Plotline Backend

Bun + TypeScript backend for Plotline: Postgres 18 for data, Redis as a cache, and book data imported from OpenLibrary's dumps. Contributor docs start at [AGENTS.md](AGENTS.md).

```bash
bun install      # dependencies
bun start        # run the server
bun run dev      # run with watch mode
```

## Environment

Create a `.env` file in the root directory:

```env
# Postgres
POSTGRES_DB_NAME=plotline_dev
POSTGRES_USER=yourusername
POSTGRES_PASSWORD=yourpassword
POSTGRES_PORT=5433

# Redis
REDIS_PASSWORD=redispassword
REDIS_PORT=6380

# Storage on the Docker host
ROOT_DIR=/your/dir/here
DB_DIR=${ROOT_DIR}/db/data
POSTGRES_DB_DIR=${DB_DIR}/postgres
REDIS_DB_DIR=${DB_DIR}/redis

# Server
DB_HOST=192.168.1.123
BACKEND_PORT=3001

# User agent sent to OpenLibrary
APP_NAME=Plotline/Testing
APP_EMAIL_CONTACT=example@mail.com
```

Set `DB_HOST` to `localhost` if the databases run on the same machine.

## Databases

Start the containers (see [docs/infrastructure.md](docs/infrastructure.md) for running them on another Docker host):

```bash
docker compose --env-file .env -f db/docker/docker-compose.yml up -d
```

Postgres creates the database and user on first start. Then build the schema and load seed data:

```bash
bun run db:reset                              # only for databases whose name ends in _dev
bun run import:openlibrary --download --limit 200000   # a sample of the book catalog
```

See [docs/database.md](docs/database.md) and [docs/imports.md](docs/imports.md).

## Connecting from your PC

**SQL client** (DBeaver, or VS Code with SQLTools and its PostgreSQL driver):
- Host: `DB_HOST`, port: `POSTGRES_PORT`
- Database: `POSTGRES_DB_NAME`
- Username and password: `POSTGRES_USER` and `POSTGRES_PASSWORD`

**Command line**:
```bash
psql -h <DB_HOST> -p 5433 -U yourusername plotline_dev
```

**Redis** (e.g. the Redis extension for VS Code): host `DB_HOST`, port `REDIS_PORT`, password `REDIS_PASSWORD`.
