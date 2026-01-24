import type { RemoteId, UUID } from "../types.ts";

export type Book = {
    id: UUID;
    title: string;
    subtitle?: string;
    bio?: string;
    numberOfPages: number;
    xp: number;
    workId?: string;
    coverId?: string;
    remoteIds?: RemoteId[];
}

export type NewBook = Omit<Book, 'id'>;