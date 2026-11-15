import { z } from 'zod';

// Mirrors the rows seeded into the `sources` table (db/creation/inserts/01-lookups.sql).
// Data providers first, then identifier-only namespaces.
export const SourceNameSchema = z.enum([
    'community', 'gcd', 'google_books', 'wikidata', 'openlibrary',
    'goodreads', 'librarything', 'isni', 'viaf', 'storygraph',
    'amazon', 'musicbrainz', 'lc_naf', 'opac_sbn', 'gnd',
    'bookbrainz', 'imdb', 'librivox', 'project_gutenberg', 'inventaire'
]);

export const ExternalIdSchema = z.object({
    source: SourceNameSchema,
    id: z.string().min(1).max(255)
});

export type SourceName = z.infer<typeof SourceNameSchema>;
export type ExternalId = z.infer<typeof ExternalIdSchema>;
