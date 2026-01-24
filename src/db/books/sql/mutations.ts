import { mysql } from "../../bindings/mysql.ts";
import type { UUID, RemoteId } from "../../types.ts";
import type { Book } from "../types.ts";


type BookFields = Pick<Book, 'title' | 'subtitle' | 'bio' | 'numberOfPages' | 'xp'>;
export function createBook(id: UUID, d: BookFields) {
    return mysql`
        INSERT INTO books (id, title, subtitle, bio, number_of_pages, xp)
        VALUES(UNHEX(${id}), ${d.title}, ${d.subtitle}, ${d.bio}, ${d.numberOfPages}, ${d.xp});
    `;
}

type BookOlFields = Pick<Book, 'workId' | 'coverId'>;
export function createBookOl(bookId: UUID, d: BookOlFields) {
    return mysql`
        INSERT INTO books_ol (book_id, work_id, cover_id)
        VALUES(UNHEX(${bookId}), ${d.workId}, ${d.coverId});
    `;
}

export function createBookAuthor(authorId: UUID, bookId: UUID) {
    return mysql`
        INSERT INTO book_authors (author_id, book_id)
        VALUES(UNHEX(${authorId}), UNHEX(${bookId}));
    `;
}

type BookRemoteIdFields = Pick<RemoteId, 'source' | 'id'>;
export function createBookRemoteId(bookId: UUID, d: BookRemoteIdFields) {
    return mysql`
        INSERT INTO books_remote_ids (book_id, source, remote_id)
        VALUES(UNHEX(${bookId}), ${d.source}, ${d.id});
    `;
}