import { z } from 'zod';
import { UUIDSchema } from './common.ts';
import { RemoteIdSchema, WorkOlidSchema } from './openlibrary.ts';

export const BookSchema = z.object({
    id: UUIDSchema,
    title: z.string().max(255),
    subtitle: z.string().max(255).optional(),
    bio: z.string().optional(),
    numberOfPages: z.number().int().min(0),
    xp: z.number().int().min(0),
    workId: WorkOlidSchema.optional(),
    coverId: z.number().int().optional(),
    remoteIds: z.array(RemoteIdSchema).optional()
});

export const NewBookSchema = BookSchema.omit({ id: true });

export type Book = z.infer<typeof BookSchema>;
export type NewBook = z.infer<typeof NewBookSchema>;
