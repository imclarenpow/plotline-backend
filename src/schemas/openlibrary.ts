import { z } from 'zod';

export const WorkOlidSchema = z.string().regex(/^OL\d+W$/);
export const AuthorOlidSchema = z.string().regex(/^OL\d+A$/);
export const WorkOlidResponseSchema = z.string().regex(/^(\/works\/)?OL\d+W$/);

// TODO: Add in expected payload fields that will be used.
export const SearchPayloadSchema = z.object({
    docs: z.array(z.object({
        key: WorkOlidResponseSchema,
        title: z.string(),
        
    }))
})

// Remote Identifiers. To expand as we find further sources.
export const RemoteSourceSchema = z.enum([
    'goodreads', 'librarything', 'isni', 'wikidata',
    'viaf', 'storygraph', 'amazon', 'musicbrainz',
    'lc_naf', 'opac_sbn', 'gnd', 'bookbrainz',
    'imdb', 'librivox', 'project_gutenberg', 'inventaire'
]);

export const RemoteIdSchema = z.object({
    source: RemoteSourceSchema,
    id: z.string()
});

export const CoverSizeSchema = z.enum(['S', 'M', 'L']);


export type CoverSize = z.infer<typeof CoverSizeSchema>;
export type RemoteSource = z.infer<typeof RemoteSourceSchema>;
export type RemoteId = z.infer<typeof RemoteIdSchema>;
export type WorkOlid = z.infer<typeof WorkOlidSchema>;