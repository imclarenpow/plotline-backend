# API

All routes are `GET` and wired in `src/index.ts`. Base URL in development: `http://localhost:${BACKEND_PORT}` (3001).

Every error returns `{ "error": "<message>" }` with status `500`. Responses are JSON, sent with `jsonResponse()`.

## Search

`/api/search/:query` searches **our own catalog** (Postgres full-text, filled by [imports](imports.md)) and caches the response in Redis for 24h under `search:v2:{query}`. The `v2` changes whenever the cached shape does, so old entries are never served.

- Results come in this order:
  1. Exact titles, ignoring case and accents (`love` puts books titled *Love* first)
  2. Full-text title matches, ranked by relevance and then by edition count. Every word is required, and the last one is matched as a prefix because it may still be being typed (`harry pot` finds *Harry Potter*)
  3. Works by contributors whose names match (`tolkien`)
  4. Only if nothing above matched and the query is at least 5 letters: typo-tolerant matches on titles and contributor names using trigram similarity (`tolkein`, `hary poter`)
- Each query ranks at most `maxRankedCandidates` (2,000) full-text matches, so a very common word like "the" stays fast. Tuning values are in `src/config/search.ts`.
- Accents and case are ignored (`asterix` finds *Astérix*), and short words and stopwords are searchable (`It`, `The Stand`).
- **Fallback:** when the catalog returns fewer than `minCatalogResults` (5), OpenLibrary's `search.json` fills the rest, limited to the fields in `SEARCH_PARAMS`. Results the catalog already returned are dropped.
- **When a source fails:** if the catalog query fails, OpenLibrary answers alone; if OpenLibrary fails but the catalog found something, the catalog results are returned. Either way the partial answer isn't cached. Only when both fail does the route return `500`.
- `authors` lists every contributor once, in display order, whatever their roles.

Response (`SearchResponse` in `src/schemas/search.ts`), up to 20 results (`config/search.ts`):

```json
{ "query": "dune", "results": [
  { "id": "0190…", "olid": "OL893415W", "title": "Dune", "subtitle": null,
    "authors": ["Frank Herbert"], "firstPublishedYear": 1965,
    "coverUrl": "https://covers.openlibrary.org/b/id/11481354-M.jpg", "source": "catalog" }
] }
```

`id` is our work ID and is `null` for results only OpenLibrary has. `olid` opens the book with `/api/books/:olid`.

## Books (OpenLibrary)

These read from OpenLibrary through a Redis read-through cache (24h TTL). They don't read the catalog yet.

| Route | Returns | Redis key |
|---|---|---|
| `/api/books/:query` | One OpenLibrary work. `:query` must be a work ID (`OL{digits}W`) | `work:{id}` |
| `/api/books/:query/editions` | Up to 100 editions of a work | `edition:{id}` |

## Infrastructure

| Route | Does |
|---|---|
| `/api/test/postgres` | Runs `SELECT 1 AS ok` |
| `/api/test/redis` | Sends `PING`; returns `PONG` |
| `/api/debug/redis-flush` | **`FLUSHALL`: clears all of Redis**, not just Plotline keys. Development only |

## Known issues

- **Duplicate fetches.** Concurrent identical requests can each miss the cache and call OpenLibrary. A fetch lock is planned (see [todo.md](todo.md)).
- **No 503 response.** If OpenLibrary is unreachable, routes return `500` like any other error.
