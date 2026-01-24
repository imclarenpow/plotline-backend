import type { Book } from "../books/types.ts";
import type { UUID } from "../types.ts";

export type Shelf = {
    id: UUID;
    ownerId: UUID;
    name: string;
    bio: string;
    createdAt: string;
    books?: Book[];
}