# Infrastructure

Postgres and Redis run as Docker containers on a separate Docker host on the LAN (`DB_HOST` in `.env`). Compose file: `db/docker/docker-compose.yml`. All configuration comes from `.env` at the repo root, which is not committed.

## Containers

| Container | Host port | Notes |
|---|---|---|
| `plotline-postgres` | `POSTGRES_PORT` (5433) → 5432 in the container | Postgres 18. The database and user are only created on first start with an empty data folder. Not on 5432 because another stack already uses it. Memory is tuned for a 16 GB host shared with other containers: a 1 GB cache of its own (`shared_buffers`), with the rest left to the OS page cache |
| `plotline-redis` | `REDIS_PORT` (6380) → 6379 in the container | Not on 6379 because another stack on the host already publishes that port. Capped at 256 MB, evicting the least-used keys, since it's only a cache |

Data is bind-mounted from `POSTGRES_DB_DIR` and `REDIS_DB_DIR` on the host, so recreating the containers keeps the data. **Check the data drive is mounted before recreating them:** otherwise Postgres starts against an empty folder and creates a fresh database.

## Managing the containers from a dev machine

The containers are managed over SSH with a Docker context, using key-based SSH auth:

```bash
docker context create plotline-host --docker "host=ssh://<user>@<docker-host>"

docker --context plotline-host compose --env-file .env -f db/docker/docker-compose.yml up -d
docker --context plotline-host compose --env-file .env -f db/docker/docker-compose.yml ps
```

`--env-file .env` is required: Compose otherwise looks for `.env` next to the compose file. The containers also appear in Portainer on the host, marked as created outside Portainer.

`bun run db:reset` uses the same context. Set `DOCKER_CONTEXT` to use a different one. See [database.md](database.md).

## Checking connectivity

```bash
bun run test:db                         # Postgres + Redis connection tests and repo integration tests
```

Or, with the server running, `GET /api/test/postgres` and `GET /api/test/redis`.

To browse the data, connect a SQL client such as DBeaver (PostgreSQL driver) to `DB_HOST`, port `POSTGRES_PORT`, database `POSTGRES_DB_NAME`, with `POSTGRES_USER` and `POSTGRES_PASSWORD`.

If both fail at once, check that the ports are reachable (`Test-NetConnection <host> -Port 5433` on Windows), then check the containers on the host (`docker ps -a --filter name=plotline`).
