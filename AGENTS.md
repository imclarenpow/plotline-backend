# Plotline Backend — Agent Instructions

Bun + TypeScript backend for Plotline, a reading app that awards XP ("plotpoints") per book, with a comics-first focus. Postgres 18 stores data, Redis is a cache, and external sources (OpenLibrary now; GCD, Wikidata and Google Books planned) supply book data.

## Read before you work on...

| Area | Read |
|---|---|
| Schema, SQL, repos, `db:reset` | [docs/database.md](docs/database.md) |
| XP / plotpoints | [docs/xp.md](docs/xp.md) |
| Adding or using an external data source | [docs/data-sources.md](docs/data-sources.md) (licensing rules) |
| Importing dumps into the catalog | [docs/imports.md](docs/imports.md) |
| Routes and caching behaviour | [docs/api.md](docs/api.md) |
| Docker host, containers, connectivity | [docs/infrastructure.md](docs/infrastructure.md) |
| What's planned next | [docs/todo.md](docs/todo.md) |

**Keep docs current:** update the relevant doc in the same commit as the code change. When something in `docs/todo.md` ships, remove it there. A doc that disagrees with the code is a bug.

## Stack

- **Runtime**: Bun **≥ 1.4** (not Node.js): `bun:test`, `Bun.serve()`, Bun's SQL and Redis clients
- **Language**: TypeScript strict; `"module": "Preserve"`, so imports keep the `.ts` extension
- **Validation**: Zod; derive types with `z.infer<>`
- **DB**: Postgres via `` pg`...` `` tagged templates (Bun's SQL client); no ORM
- **Server**: `Bun.serve({ port, routes })` with plain route objects; no middleware

Env vars (in `.env`, not committed): `DB_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `POSTGRES_DB_NAME`, `POSTGRES_DB_DIR`, `REDIS_PASSWORD`, `REDIS_PORT`, `BACKEND_PORT`, `APP_NAME`, `APP_EMAIL_CONTACT`. Optional: `IMPORT_DATA_DIR`.

## Commands

```bash
bun run dev        # watch mode
bun run test:git   # unit tests; DB tests are skipped
bun run test:db    # DB tests (live Postgres + Redis): bindings + repo integration
bun run db:reset   # rebuild the dev database (only names ending in _dev)
bun run import:openlibrary --download   # import OpenLibrary dumps into the catalog
bunx tsc --noEmit  # typecheck
```

## Layout

```
src/
  index.ts          ← routes object
  api/              ← handlers; return jsonResponse()
  schemas/          ← Zod schemas + inferred types (works, contributors, sources, ...)
  db/
    bindings/       ← Postgres (pg) and Redis singletons
    utils.ts        ← newUuid, uuidToBinary/binaryToUuid, toDateString, toExternalIds
    testing.ts      ← describeDb (DB tests only run under test:db)
    {domain}/       ← works, contributors, shelves, search, imports
      types.ts      ← re-exports from schemas
      repo.ts       ← composes SQL modules; maps rows to typed objects
      sql/lookups.ts, sql/mutations.ts   ← SELECTs / writes only
      redis/        ← cache lookups and mutations
  services/         ← external API clients (openlibrary/)
  import/           ← dump importers: dump.ts, isbn.ts, {source}/parse.ts + run.ts
  config/           ← constants per service
db/
  creation/         ← schema (numbered, run in order) + inserts/ seeds
  dummy-data/       ← loaded by db:reset
  reset.ts          ← db:reset script
docs/               ← see the table above
```

## Coding practices

- **Reuse helpers** (`jsonResponse`, `newUuid`, `uuidToBinary`, `binaryToUuid`, `toDateString`, `toExternalIds`) instead of writing the same logic again; extract shared logic rather than duplicating it
- **Compose:** SQL modules expose focused functions, repos compose them, handlers call repos
- **Validate at boundaries:** use Zod before calling external APIs or accepting user input, not between trusted internal layers
- **Branded types:** `UUID`, `DateString` and `ExternalId` from `src/db/types.ts`

## Feature workflow

1. **Schema**: Zod schema in `src/schemas/`, export `z.infer<>` types
2. **SQL**: `src/db/{domain}/sql/lookups.ts` and `mutations.ts`. Mutations take `db: SQL = pg` so they can run in transactions
3. **Repo**: `src/db/{domain}/repo.ts`
4. **Handler**: `src/api/`; try/catch returning `{ error }` with a status
5. **Route**: wire into `src/index.ts`
6. **Tests**: colocated `.test.ts`; all test functions `async`
7. **Docs**: update the relevant `docs/` page

Route pattern:

```typescript
"/api/resource/:param": async req => {
    try {
        return await myHandler(req.params.param);
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
```

Redis read-through pattern (see `src/api/books.ts`): get cached → return if hit → fetch → cache → return.

## Testing

- Wrap tests that need Postgres or Redis in `describeDb` from `src/db/testing.ts`. They skip unless `RUN_DB_TESTS=1`, which `test:db` sets. Use `afterAllDb` for cleanup that queries the database, so it never connects when the tests are skipped
- DB tests run against the dev database: use unique IDs and delete what you create in `afterAll`
- `bun test` forces UTC, so timezone bugs won't show up in tests

## OpenLibrary

- Validate work IDs with `WorkOlidSchema` (`OL{digits}W`) before any request
- Limit search fields to `SEARCH_PARAMS` in `src/config/openlibrary.ts`

## Scope boundaries

- No ORM, HTTP framework, middleware stack or router library
- No linter, formatter or build pipeline unless explicitly requested
- No data source that can't be used commercially (see docs/data-sources.md)
- No bulk data from live APIs: use the source's dumps (see docs/imports.md)
