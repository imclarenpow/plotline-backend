# API

All routes are `GET` and wired in `src/index.ts`. Base URL in development: `http://localhost:${BACKEND_PORT}` (3001).

Every error returns `{ "error": "<message>" }` with status `500`. Responses are JSON, sent with `jsonResponse()`.

## Books (OpenLibrary)

These read from OpenLibrary through a Redis read-through cache (24h TTL). They don't touch MySQL yet.

| Route | Returns | Redis key |
|---|---|---|
| `/api/search/:query` | OpenLibrary search results, limited to 20 (`config/search.ts`) and the fields in `SEARCH_PARAMS` (`config/openlibrary.ts`) | `search:{query}` |
| `/api/books/:query` | One OpenLibrary work. `:query` must be a work ID (`OL{digits}W`) | `work:{id}` |
| `/api/books/:query/editions` | Up to 100 editions of a work | `edition:{id}` |

After a search, each result is also cached under `work:{id}`, in a reduced "DB format" (`transformBookOLDataToDBFormat`).

## Infrastructure

| Route | Does |
|---|---|
| `/api/test/mysql` | Runs `SELECT 1 AS ok` |
| `/api/test/redis` | Sends `PING`; returns `PONG` |
| `/api/debug/redis-flush` | **`FLUSHALL`: clears all of Redis**, not just Plotline keys. Development only |

## Known issues

- **Search overwrites the work cache.** Because search results are cached under `work:{id}` in the reduced format, `/api/books/:id` returns that reduced shape instead of the full work for 24h after the work appears in a search.
- **Duplicate fetches.** Concurrent identical requests can each miss the cache and call OpenLibrary. A fetch lock is planned (see [todo.md](todo.md)).
- **No 503 response.** If OpenLibrary is unreachable, routes return `500` like any other error.
