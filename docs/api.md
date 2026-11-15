# API

All routes are `GET` and wired in `src/index.ts`. Base URL in development: `http://localhost:${BACKEND_PORT}` (3001).

Responses are JSON, sent with `jsonResponse()`. Errors are `{ "error": "<message>" }`, sent with `errorResponse()`:

| Status | When |
|---|---|
| `400` | A malformed ID, or an unknown source |
| `404` | No such work, in the catalog or the source |
| `503` | `{ "error": "Open Library API unreachable" }`: OpenLibrary timed out (10s), refused the connection, rate-limited us or answered 5xx |
| `500` | Anything else |

Handlers throw `HttpError(status, message)` from `src/utils/api.ts` for the first three; anything else thrown is a `500`.

**Works are addressed by our own ID** (a UUID), never by a source's. A source's ID only gets you to a work through `/api/works/resolve`, which returns our ID along with the work. Clients should store our ID: OpenLibrary IDs change when works are merged, and works from other sources (e.g. GCD) may have no OpenLibrary ID at all.

## Search

`/api/search/:query` searches **our own catalog** (Postgres full-text, filled by [imports](imports.md)) and caches the response in Redis for 24h under `search:v3:{query}`. The `v3` changes whenever the cached shape does, so old entries are never served.

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
  { "id": "0190…", "ref": { "source": "openlibrary", "id": "OL893415W" }, "title": "Dune", "subtitle": null,
    "authors": ["Frank Herbert"], "firstPublishedYear": 1965,
    "coverUrl": "https://covers.openlibrary.org/b/id/11481354-M.jpg", "source": "catalog" }
] }
```

To open a result: if `id` is set, call `/api/works/:id`; if it's `null` (only OpenLibrary has the book), call `/api/works/resolve/{ref.source}/{ref.id}`, which imports it and returns its new `id`. `ref` is the work's ID in a source (the OpenLibrary ID, for now), and is also how catalog and OpenLibrary results are deduplicated.

## Works

| Route | Returns |
|---|---|
| `/api/works/:id` | One work (`WorkDetail` in `src/schemas/works.ts`): its fields, `externalIds`, `contributors` (`{ id, name, role }`, in display order, one entry per role) and one `coverUrl`. Catalog only: never calls a source |
| `/api/works/:id/editions` | `{ workId, editions }`: the work's editions in the catalog, oldest first |
| `/api/works/resolve/:source/:externalId` | The same as `/api/works/:id`, for the work with that ID in a source, e.g. `/api/works/resolve/openlibrary/OL893415W` |

These read Postgres directly and aren't cached in Redis: they're indexed lookups on our own data, and a cache would have to be cleared whenever XP or an import changes a work.

**Resolve** looks the ID up in `work_external_ids`, so any source's ID works (`/resolve/goodreads/…` finds a work the OpenLibrary import attached a Goodreads ID to). If the catalog doesn't have it:

- **`openlibrary`** fetches the work, its authors and up to 100 editions from the API and imports them, the way the dump import would (see [imports.md](imports.md#on-demand-imports)). The next request is a plain catalog lookup. The ID must match `OL{digits}W`.
- **Any other source** answers `404`: only OpenLibrary can import works one at a time so far.

## Infrastructure

| Route | Does |
|---|---|
| `/api/test/postgres` | Runs `SELECT 1 AS ok` |
| `/api/test/redis` | Sends `PING`; returns `PONG` |
| `/api/debug/redis-flush` | **`FLUSHALL`: clears all of Redis**, not just Plotline keys. Development only |

## Known issues

- **Duplicate fetches.** Concurrent identical searches can each miss the cache and call OpenLibrary, and concurrent resolves of the same new work each fetch it (only one import wins; the other links to it). A fetch lock is planned (see [todo.md](todo.md)).
- **No "not found" cache.** Resolving an OpenLibrary ID that doesn't exist calls OpenLibrary every time.
