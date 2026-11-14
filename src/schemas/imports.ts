import { z } from 'zod';
import { DateSchema } from './common.ts';
import { ExternalIdSchema } from './sources.ts';
import { Isbn10Schema, Isbn13Schema, PageCountSchema, YearSchema } from './works.ts';

// Records an importer hands to the imports repo, after parsing a source's dump.
// Every record is keyed by its ID in that source, so re-importing updates instead of duplicating.

export const ImportWorkSchema = z.object({
    externalId: z.string().min(1).max(255),
    title: z.string().min(1).max(255),
    subtitle: z.string().max(255).nullable(),
    description: z.string().nullable(),
    firstPublishedYear: YearSchema.nullable(),
    // Stored in work_signals for XP: only the fields XP uses.
    signals: z.record(z.string(), z.unknown()).nullable(),
});

export const ImportContributorSchema = z.object({
    externalId: z.string().min(1).max(255),
    name: z.string().min(1).max(255),
    bio: z.string().nullable(),
    birthDate: DateSchema.nullable(),
    deathDate: DateSchema.nullable(),
    otherIds: z.array(ExternalIdSchema),
});

export const ImportWorkContributorsSchema = z.object({
    workExternalId: z.string().min(1).max(255),
    // In display order.
    contributorExternalIds: z.array(z.string().min(1).max(255)),
    role: z.string().min(1).max(30),
});

export const ImportEditionSchema = z.object({
    externalId: z.string().min(1).max(255),
    workExternalId: z.string().min(1).max(255),
    isbn13: Isbn13Schema.nullable(),
    isbn10: Isbn10Schema.nullable(),
    pageCount: PageCountSchema.nullable(),
    publishedYear: YearSchema.nullable(),
    language: z.string().length(3).nullable(),
    coverUrl: z.string().max(512).nullable(),
    publisher: z.string().min(1).max(255).nullable(),
    otherIds: z.array(ExternalIdSchema),
});

export type ImportWork = z.infer<typeof ImportWorkSchema>;
export type ImportContributor = z.infer<typeof ImportContributorSchema>;
export type ImportWorkContributors = z.infer<typeof ImportWorkContributorsSchema>;
export type ImportEdition = z.infer<typeof ImportEditionSchema>;
