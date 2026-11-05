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

export const CoverSizeSchema = z.enum(['S', 'M', 'L']);

export type CoverSize = z.infer<typeof CoverSizeSchema>;
export type WorkOlid = z.infer<typeof WorkOlidSchema>;