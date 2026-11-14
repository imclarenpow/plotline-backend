import { z } from 'zod';
import { UUIDSchema, DateTimeSchema } from './common.ts';
import { WorkSchema } from './works.ts';

export const ShelfSchema = z.object({
    id: UUIDSchema,
    ownerId: UUIDSchema,
    name: z.string().min(1).max(50),
    bio: z.string().optional(),
    createdAt: DateTimeSchema,
    works: z.array(WorkSchema).optional()
});

export type Shelf = z.infer<typeof ShelfSchema>;
