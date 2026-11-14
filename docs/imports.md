# Imports

Book data comes into the catalog from **bulk data dumps**, not live API calls. Search and book pages then read our own MySQL tables, and the live APIs are only a fallback.

This is required, not just faster: OpenLibrary's usage guidelines say its APIs "are not intended to serve as a bulk data backend or high-traffic commercial infrastructure" and point heavy users at the monthly dumps.

## Running an import

```bash
bun run import:openlibrary --download       # fetch the dumps into data/ if missing, then import
bun run import:openlibrary --limit 200000   # a sample: only the first 200k edition lines
bun run import:openlibrary --dir D:/dumps   # read dumps from another folder
```

Dumps are saved in `IMPORT_DATA_DIR` (default `data/`, which is gitignored). Downloads show a progress bar with percentage, size, speed and time remaining; when output isn't a terminal (logs, CI) a progress line is printed every 10 seconds instead. A download goes to a `.part` file first and is renamed only when complete, so if one is interrupted, delete the `.part` file and run again. The OpenLibrary dumps are large (the editions file alone is over 10 GB gzipped), so download them once and reuse them. The script writes to the database named in `.env`.

Each run is recorded in `import_runs` with its status, per-step counts (`stats`) and any error.

## Pipeline

| File | Does |
|---|---|
| `src/import/dump.ts` | Source-independent helpers: stream a gzipped file line by line, batch records, `IdSet` (a bitmap that holds tens of millions of IDs in a few MB), download a dump |
| `src/import/progress.ts` | Download progress bar: percentage, size, speed and time remaining |
| `src/import/isbn.ts` | ISBN-10/13 validation (check digits) and ISBN-10 → ISBN-13 conversion |
| `src/import/{source}/parse.ts` | Pure functions: one dump record → `ImportWork` / `ImportEdition` / `ImportContributor`. Validates with Zod |
| `src/import/{source}/run.ts` | The CLI: streams the dumps through the parser into the repo |
| `src/db/imports/repo.ts` | Batch writes, one transaction per batch (`IMPORT_BATCH_SIZE`). Source-independent |
| `src/config/imports.ts` | Dump URLs, data folder, language filter, batch size |

### Rules the repo follows
- **Match by external ID.** Records are keyed by the source's own ID (`work_external_ids` etc.), so re-importing next month's dump updates rows instead of duplicating them.
- **Fill, don't overwrite.** An import only fills fields that are still `NULL`. It never replaces a title or name, or a value that a higher-priority source or a person set.
- **One ISBN, one edition.** An edition whose ISBN-13 already belongs to another edition is merged into it: the source ID is attached to the existing edition, and its empty fields are filled.
- **Cross-reference IDs are first come, first served.** Goodreads, Wikidata and similar IDs use `INSERT IGNORE`, because sources contain duplicate records that share them.
- **Only XP fields go in `work_signals`.** For OpenLibrary that's the subject list.
- When a run succeeds, `finishImportRun` recalculates `works.edition_count`, which search uses for ranking. Every importer gets this by finishing its run.

## OpenLibrary

Kept: editions with a valid ISBN whose language is in `OPENLIBRARY_LANGUAGES` (`eng`), plus their works and those works' authors. Editions with no language are left out unless `OPENLIBRARY_INCLUDE_NO_LANGUAGE` is set; the live search fallback still finds those books.

The script makes five streaming passes, because each step needs IDs that an earlier one wrote:

1. **Editions:** pick the editions to keep and remember their numbers and their works' numbers (in `IdSet`s)
2. **Works:** write those works and their subjects; remember their authors
3. **Authors:** write those authors as contributors, with their Wikidata/VIAF/ISNI IDs
4. **Works again:** link works to authors (role `author`, in order)
5. **Editions again:** write the editions picked in pass 1, with publishers and Goodreads/LibraryThing IDs

Each pass checks a line's key against the ID sets before parsing its JSON, and editions are pre-filtered on ISBN and language with a substring check, so most lines are never parsed. `--limit` applies to the edition lines read in passes 1 and 5.

What isn't imported yet: edition titles (`editions.title` is only for titles that differ from the work's), physical format, series, and works without any qualifying edition.

## Adding a source

1. Add a `parse.ts` that turns the source's dump records into the `Import*` types in `src/schemas/imports.ts`, with tests
2. Add a `run.ts` and a `import:{source}` script in `package.json`
3. Use the existing `src/db/imports/repo.ts` functions with the source's name. Add a repo function only for data the catalog doesn't have yet

GCD is next (see [todo.md](todo.md)). Per [database.md](database.md), its raw dump goes into a separate `gcd` database; only matched IDs and XP signals are copied into the catalog.
