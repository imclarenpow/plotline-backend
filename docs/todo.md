# Planned work

Things that are agreed but not built. Remove an item when it ships, and update the matching doc.

## XP (see [xp.md](xp.md))
1. Create the work row on first open of a book the import didn't include (OpenLibrary API fallback), so XP can be computed for it
2. Subject matcher: normalise OpenLibrary subject strings and match them against `subjects.normalized_name`, producing `XpSubject[]` for `calculateXp`
3. Wikidata signals: format, genre and awards, looked up by OpenLibrary ID (P648). Comes from the Wikidata importer under Imports
4. GCD signals: page counts and story types from the GCD importer under Imports
5. Google Books client: page count and categories by ISBN
6. `getXpSignals(workId)`: query the sources, store `work_signals`, build an `XpInput`, call `calculateXp` and save with `setWorkXp`
7. Format resolver: GCD match → Google Books categories → Wikidata → publisher → OpenLibrary subjects
8. Query `difficulty_ratings` into `XpInput.communityRating` (the blending itself is already in `calculateXp`)

## API
- Return `503` with `{ "error": "Open Library API unreachable" }` when OpenLibrary can't be reached; keep `500` for other errors
- Serve `/api/books/:olid` from the catalog when the work is there, calling OpenLibrary only for works the import didn't include

## Imports (see [imports.md](imports.md))
- GCD importer: dump into a separate `gcd` database, then match to catalog editions by ISBN/barcode
- Wikidata importer: format, genre and awards for catalog works via P648, from a filtered dump or batched SPARQL
- Run imports monthly, when new dumps are published
- Import edition titles, physical format and series from the OpenLibrary dump

## Redis
- Fetch lock (`SET lock:{key} NX EX 10`) so concurrent identical requests don't repeat the same API calls
- Cache "not found" results for a short time, so lookups for books a source doesn't have don't call its API every time
- One key prefix and TTL per source (e.g. `wikidata:{olid}` for 7 days)
