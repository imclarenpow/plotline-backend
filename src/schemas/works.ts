import { z } from 'zod';
import { UUIDSchema } from './common.ts';
import { ExternalIdSchema } from './sources.ts';

// Format names live in the `formats` lookup table, so they are not a fixed enum here.
export const FormatNameSchema = z.string().min(1).max(30);
export const PageCountSchema = z.number().int().min(1).max(65535);
export const YearSchema = z.number().int().min(-9999).max(9999);
export const Isbn13Schema = z.string().regex(/^\d{13}$/);
export const Isbn10Schema = z.string().regex(/^\d{9}[\dX]$/);

export const WorkSchema = z.object({
    id: UUIDSchema,
    title: z.string().min(1).max(255),
    subtitle: z.string().max(255).nullish(),
    description: z.string().nullish(),
    format: FormatNameSchema.nullish(),
    firstPublishedYear: YearSchema.nullish(),
    pageCount: PageCountSchema.nullish(),
    xp: z.number().int().min(0).nullish(),
    xpVersion: z.number().int().min(0).nullish(),
    externalIds: z.array(ExternalIdSchema).optional()
});

export const NewWorkSchema = WorkSchema.omit({ id: true, xp: true, xpVersion: true });

export const EditionSchema = z.object({
    id: UUIDSchema,
    workId: UUIDSchema,
    title: z.string().max(255).nullish(),
    isbn13: Isbn13Schema.nullish(),
    isbn10: Isbn10Schema.nullish(),
    pageCount: PageCountSchema.nullish(),
    publishedYear: YearSchema.nullish(),
    language: z.string().length(3).nullish(),
    coverUrl: z.url().max(512).nullish(),
    externalIds: z.array(ExternalIdSchema).optional()
});

export const NewEditionSchema = EditionSchema.omit({ id: true, workId: true });

export type Work = z.infer<typeof WorkSchema>;
export type NewWork = z.infer<typeof NewWorkSchema>;
export type Edition = z.infer<typeof EditionSchema>;
export type NewEdition = z.infer<typeof NewEditionSchema>;
