// "YYYY-MM-DD" format for dates
import type { RemoteId, UUID } from "../types.ts";

export type Author = {
    id: UUID;
    name: string;
    bio?: string;
    birthDate?: string;
    deathDate?: string;
    // from authors_ol
    olid?: string;
    coverId?: number;
    remoteIds?: RemoteId[];
}

export type NewAuthor = Omit<Author, 'id'>;