// Bulk imports from source data dumps (see docs/imports.md).

// Where dump files are downloaded to and read from. Not committed (see .gitignore).
export const IMPORT_DATA_DIR = process.env.IMPORT_DATA_DIR ?? 'data';

// Rows written per transaction.
export const IMPORT_BATCH_SIZE = 1000;

// Log progress every this many dump lines.
export const IMPORT_PROGRESS_EVERY = 500_000;

// OpenLibrary monthly dumps. The *_latest URLs redirect to the newest dated dump on
// archive.org (e.g. ol_dump_works_2026-10-31.txt.gz), which is the name it's saved under.
export const OPENLIBRARY_DUMPS = {
    editions: { url: 'https://openlibrary.org/data/ol_dump_editions_latest.txt.gz' },
    works: { url: 'https://openlibrary.org/data/ol_dump_works_latest.txt.gz' },
    authors: { url: 'https://openlibrary.org/data/ol_dump_authors_latest.txt.gz' },
} as const;

// Only editions with a valid ISBN in one of these languages (ISO 639-2, as OpenLibrary
// uses) are imported, plus the works and authors they belong to.
export const OPENLIBRARY_LANGUAGES = ['eng'];

// Many editions have no language at all. Leaving them out keeps the import much smaller;
// the live search fallback still finds them.
export const OPENLIBRARY_INCLUDE_NO_LANGUAGE = false;
