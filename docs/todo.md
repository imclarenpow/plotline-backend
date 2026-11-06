# Planned work

Things that are agreed but not built. Remove an item when it ships, and update the matching doc.

## XP (see [xp.md](xp.md))
1. Store ISBNs from the editions endpoint in `editions` / `edition_external_ids`
2. Subject matcher: normalise OpenLibrary subject strings and match them against `subjects.normalized_name`, producing `XpSubject[]` for `calculateXp`
3. Wikidata client (`src/services/wikidata/`): format, genre and awards via SPARQL, looked up by OpenLibrary ID (P648)
4. GCD dump import into a separate `gcd` database, and an ISBN/barcode lookup
5. Google Books client: page count and categories by ISBN
6. `getXpSignals(workId)`: query the sources, store `work_signals`, build an `XpInput`, call `calculateXp` and save with `setWorkXp`
7. Format resolver: GCD match → Google Books categories → Wikidata → publisher → OpenLibrary subjects
8. Query `difficulty_ratings` into `XpInput.communityRating` (the blending itself is already in `calculateXp`)

## API
- Return `503` with `{ "error": "Open Library API unreachable" }` when OpenLibrary can't be reached; keep `500` for other errors
- Stop search results from overwriting the full work cache (see Known issues in [api.md](api.md))

## Redis
- Fetch lock (`SET lock:{key} NX EX 10`) so concurrent identical requests don't repeat the same API calls
- Cache "not found" results for a short time, so lookups for books a source doesn't have don't call its API every time
- One key prefix and TTL per source (e.g. `wikidata:{olid}` for 7 days)
