# Plotline Backend — Agent Instructions

Bun + TypeScript backend for the Plotline reading app. MySQL 8 for persistence, Redis for caching, OpenLibrary as the external book data source.

---

## Stack

- **Runtime**: Bun ≥ 1.4 (not Node.js) — use `bun:test`, `Bun.serve()`, `bun` SQL/Redis bindings. Bun 1.3.x's MySQL client does not roll back failed transactions and can hang the connection pool.
- **Language**: TypeScript strict mode; `"module": "Preserve"` — imports must keep `.ts` extension
- **Validation**: Zod — prefer `z.infer<>` for types derived from schemas
- **DB**: MySQL via Bun's native `sql` template literals; no ORM
- **Cache**: Redis via Bun's `RedisClient`
- **Server**: `Bun.serve({ port, routes })` — no middleware stack; routes are plain objects

### Required env vars

| Var | Purpose |
|---|---|
| `DB_HOST` | Shared host for MySQL and Redis |
| `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_PORT`, `MYSQL_DB_NAME` | MySQL connection |
| `REDIS_PASSWORD`, `REDIS_PORT` | Redis connection |
| `BACKEND_PORT` | Server port |
| `APP_NAME`, `APP_EMAIL_CONTACT` | OpenLibrary `User-Agent` header |

---

## Architecture

```
src/
  index.ts              ← Bun.serve() entry; routes object wired here
  api/                  ← Route handlers; return Response
  schemas/              ← Zod schemas + inferred types
  db/
    bindings/           ← MySQL and Redis client singletons
    utils.ts            ← UUID/date conversion helpers, newUuid(), toExternalIds()
    testing.ts          ← describeDb: DB tests run only under `bun run test:db`
    {domain}/           ← works, contributors, shelves, search
      types.ts          ← Domain types (often re-exported from schemas)
      repo.ts           ← Domain repo; composes SQL modules + utils
      sql/
        lookups.ts      ← SELECT queries only
        mutations.ts    ← INSERT / UPDATE / DELETE queries only
  services/
    openlibrary/        ← External API client + Zod validation
  config/               ← Constants per service or feature
  utils/
    api.ts              ← jsonResponse() and shared response helpers
    general.ts          ← String cleaning, UUID conversion, etc.
```

---

## Coding Practices

- **Prefer abstraction** — when the same logic appears in more than one place, extract it into a shared utility or helper rather than duplicating it inline
- **Avoid boilerplate** — reach for existing helpers (`jsonResponse`, `binaryToUuid`, `uuidToBinary`, `assertDateString`) before writing equivalent inline code
- **Compose, don't repeat** — SQL modules expose focused functions; repos compose them; handlers call repos
- **Type via inference** — derive types from Zod schemas with `z.infer<>`; avoid maintaining parallel interface declarations
- **Validate at boundaries** — use Zod `safeParse()` / `parse()` before calling external APIs or accepting user input; do not validate internal function calls between trusted layers
- **Branded types** — use `UUID`, `DateString`, `ExternalId` from `src/db/types.ts` for fields that carry semantic meaning beyond their primitive type

---

## Feature Workflow

Add new features in this order:

1. **Schema** — define a Zod schema in `src/schemas/`; export `z.infer<>` types
2. **SQL** — create `src/db/{domain}/sql/lookups.ts` (reads) and `mutations.ts` (writes); use `mysql\`...\`` template literals
3. **Repo** — create `src/db/{domain}/repo.ts`; import from SQL modules and `src/db/utils.ts`
4. **Handler** — create or extend a function in `src/api/`; use `jsonResponse()` for all responses; wrap in try/catch returning `{ error }` with appropriate status
5. **Route** — wire the handler into the `routes` object in `src/index.ts`
6. **Tests** — add a `.test.ts` colocated with the module under test

---

## Response and Error Pattern

Follow the pattern in `src/index.ts`:

```typescript
"/api/resource/:param": async req => {
    try {
        return await myHandler(req.params.param);
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
```

Return all payloads with `jsonResponse()` from `src/utils/api.ts`.

---

## Caching Pattern (Redis read-through)

Follow the pattern in `src/api/books.ts`:

```typescript
const cached = await getCached(key);
if (cached) return jsonResponse(cached);
const fresh = await fetchFromSource(key);
await setCached(key, fresh);
return jsonResponse(fresh);
```

Cache lookup functions live in `src/db/{domain}/redis/lookups.ts`; write functions in `mutations.ts`.

---

## MySQL Conventions

- Use Bun's tagged template literal: `` mysql`SELECT ...` ``
- UUIDs are stored as binary(16); generate with `newUuid()` (v7, time-ordered), convert with `uuidToBinary()` on write, `binaryToUuid()` on read (from `src/db/utils.ts`)
- Date strings use the `DateString` branded type via `assertDateString()`; read DATE columns with `toDateString()`
- The schema is source-agnostic: no `*_ol` tables. Facts from any provider link through `sources` (`work_external_ids`, `edition_external_ids`, `contributor_external_ids`, `work_signals`)
- Lookup tables (`formats`, `contributor_roles`, `sources`, `subject_categories`) are referenced by name in SQL via subqueries, e.g. `(SELECT id FROM sources WHERE name = ${source})`
- Mutations take an optional executor (`db: SQL = mysql`) so repos can compose them inside `mysql.begin(async tx => ...)`
- Schema lives in `db/creation/` (numbered, run in order). Rebuild the dev database with `bun run db:reset` (refuses any database not ending in `_dev`); add `--no-dummy` to skip dummy data

---

## OpenLibrary Conventions

- Base URL: `https://openlibrary.org`
- Validate Work IDs against `WorkOlidSchema` (`OL{digits}W`) before making any request
- User-Agent is constructed automatically from `APP_NAME` + `APP_EMAIL_CONTACT`; both env vars are required at startup
- Limit search result fields to those defined in `src/config/openlibrary.ts`
- Known issue: concurrent identical requests can trigger duplicate fetches — a queue/lock is a future TODO

---

## Testing

```bash
# Unit tests (DB tests are skipped)
bun run test:git

# DB tests: bindings + repo integration tests (requires live MySQL + Redis)
bun run test:db
```

- Use `bun:test` (`describe`, `test`, `expect`, `beforeAll`)
- Wrap tests that need MySQL/Redis in `describeDb` from `src/db/testing.ts` — they skip unless `RUN_DB_TESTS=1` (set by `test:db`)
- DB integration tests run against the dev database: use unique IDs and delete what they create in `afterAll`
- `bun test` forces the UTC timezone, so timezone bugs won't show up in tests
- All test functions should be `async`

---

## Development

```bash
bun run dev      # Watch mode
bun run start    # Production
```

---

## Scope Boundaries

- Do not introduce an ORM, HTTP framework, or middleware stack
- Do not add a linter, formatter, or build pipeline unless explicitly requested
- Keep the `Bun.serve()` route-object pattern; do not refactor to a router library
