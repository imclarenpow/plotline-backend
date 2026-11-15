import { z } from 'zod';

export const WorkOlidSchema = z.string().regex(/^OL\d+W$/);
export const AuthorOlidSchema = z.string().regex(/^OL\d+A$/);
export const WorkOlidResponseSchema = z.string().regex(/^(\/works\/)?OL\d+W$/);

// One doc from search.json, limited to the fields requested in SEARCH_PARAMS that we use.
export const SearchDocSchema = z.object({
    key: WorkOlidResponseSchema,
    title: z.string(),
    subtitle: z.string().optional(),
    author_name: z.array(z.string()).optional(),
    first_publish_year: z.number().int().optional(),
    cover_i: z.number().int().optional(),
});

export const SearchPayloadSchema = z.object({
    docs: z.array(SearchDocSchema)
})

export const CoverSizeSchema = z.enum(['S', 'M', 'L']);

export type CoverSize = z.infer<typeof CoverSizeSchema>;
export type WorkOlid = z.infer<typeof WorkOlidSchema>;