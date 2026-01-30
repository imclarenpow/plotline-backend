import { z } from 'zod';
import { UUIDSchema, DateSchema } from './common.ts';
import { RemoteIdSchema } from './openlibrary.ts';

export const AuthorSchema = z.object({
    id: UUIDSchema,
    name: z.string().max(255),
    bio: z.string().optional(),
    birthDate: DateSchema.optional(),
    deathDate: DateSchema.optional(),
    olid: z.string().optional(),
    coverId: z.number().optional(),
    remoteIds: z.array(RemoteIdSchema).optional()
});

export type Author = z.infer<typeof AuthorSchema>;
