# Planned work

Things that are agreed but not built. Remove an item when it ships, and update the matching doc.

## XP (see [xp.md](xp.md))
1. Subject matcher: normalise OpenLibrary subject strings and match them against `subjects.normalized_name`, producing `XpSubject[]` for `calculateXp`
2. Wikidata signals: format, genre and awards, looked up by OpenLibrary ID (P648). Comes from the Wikidata importer under Imports
3. GCD signals: page counts and story types from the GCD importer under Imports
4. Google Books client: page count and categories by ISBN
5. `getXpSignals(workId)`: query the sources, store `work_signals`, build an `XpInput`, call `calculateXp` and save with `setWorkXp`
6. Format resolver: GCD match → Google Books categories → Wikidata → publisher → OpenLibrary subjects
7. Query `difficulty_ratings` into `XpInput.communityRating` (the blending itself is already in `calculateXp`)

## Imports (see [imports.md](imports.md))
- GCD importer: dump into a separate `gcd` database, then match to catalog editions by ISBN/barcode
- Wikidata importer: format, genre and awards for catalog works via P648, from a filtered dump or batched SPARQL
- Run `import:openlibrary --download` monthly on the Docker host (cron, or n8n with a notification), downloading straight to the data drive instead of a dev PC
- Let each source update the fields it set: record which source last set each work's and edition's fields, so a re-import can apply OpenLibrary's corrections without overwriting values from a higher-priority source or a person (do this before GCD lands)
- Follow OpenLibrary redirects and deletions in the dump import (on-demand imports already follow redirects): merge works whose IDs became redirects into the surviving work (moving shelf items and reads), and handle deleted records
- Import edition titles, physical format and series from the OpenLibrary dump

## Redis
- Fetch lock (`SET lock:{key} NX EX 10`) so concurrent identical searches and resolves don't repeat the same API calls
- Cache "not found" results for a short time, so resolving IDs a source doesn't have doesn't call its API every time
- One key prefix and TTL per source (e.g. `wikidata:{olid}` for 7 days)
