import { z } from 'zod';
import { UUIDSchema, DateSchema } from './common.ts';
import { ExternalIdSchema } from './sources.ts';

// Role names live in the `contributor_roles` lookup table.
export const ContributorRoleSchema = z.string().min(1).max(30);

export const ContributorSchema = z.object({
    id: UUIDSchema,
    name: z.string().min(1).max(255),
    bio: z.string().nullish(),
    birthDate: DateSchema.nullish(),
    deathDate: DateSchema.nullish(),
    externalIds: z.array(ExternalIdSchema).optional()
});

export const NewContributorSchema = ContributorSchema.omit({ id: true });

export type Contributor = z.infer<typeof ContributorSchema>;
export type NewContributor = z.infer<typeof NewContributorSchema>;
export type ContributorRole = z.infer<typeof ContributorRoleSchema>;
