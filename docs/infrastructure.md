# Infrastructure

MySQL and Redis run as Docker containers on a separate Docker host on the LAN (`DB_HOST` in `.env`). Compose file: `db/docker/docker-compose.yml`. All configuration comes from `.env` at the repo root, which is not committed.

## Containers

| Container | Host port | Notes |
|---|---|---|
| `plotline-mysql` | `MYSQL_PORT` (3306) | MySQL 8. The database and app user are only created on first start with an empty data folder |
| `plotline-redis` | `REDIS_PORT` (6380) → 6379 in the container | Not on 6379 because another stack on the host already publishes that port |

Data is bind-mounted from `MYSQL_DB_DIR` and `REDIS_DB_DIR` on the host, so recreating the containers keeps the data. **Check the data drive is mounted before recreating them:** otherwise MySQL starts against an empty folder and creates a fresh database.

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
bun run test:db                         # MySQL + Redis connection tests and repo integration tests
```

Or, with the server running, `GET /api/test/mysql` and `GET /api/test/redis`.

If both fail at once, check that the ports are reachable (`Test-NetConnection <host> -Port 3306` on Windows), then check the containers on the host (`docker ps -a --filter name=plotline`).
