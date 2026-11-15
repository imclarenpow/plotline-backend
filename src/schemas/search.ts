import { z } from 'zod';
import { UUIDSchema } from './common.ts';

// One search result, whether it came from our catalog or the OpenLibrary fallback.
export const SearchResultSchema = z.object({
    id: UUIDSchema.nullable(), // our work ID; null for results only OpenLibrary has
    olid: z.string().nullable(), // OpenLibrary work ID, for /api/books/:olid
    title: z.string(),
    subtitle: z.string().nullable(),
    authors: z.array(z.string()),
    firstPublishedYear: z.number().int().nullable(),
    coverUrl: z.string().nullable(),
    source: z.enum(['catalog', 'openlibrary']),
});

export const SearchResponseSchema = z.object({
    query: z.string(),
    results: z.array(SearchResultSchema),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
