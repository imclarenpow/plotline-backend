import { mysql } from "../../bindings/mysql.ts";
import type { UUID, RemoteId } from "../../types.ts";
import type { Author } from "../types.ts";

export function deleteAuthorById(authorId: UUID) {
    return mysql`
     DELETE FROM authors
     WHERE id = UNHEX(${authorId})
 `;
}

type AuthorFields = Pick<Author, 'name' | 'bio' | 'birthDate' | 'deathDate'>;
export function createAuthor(
    id: UUID, d: AuthorFields) {
    return mysql`
        INSERT INTO authors(id, name, bio, birth_date, death_date)
        VALUES(UNHEX(${id}), ${d.name}, ${d.bio}, ${d.birthDate}, ${d.deathDate});
    `;
}

type AuthorOlFields = Pick<Author, 'olid' | 'coverId'>;
export function createAuthorOl(authorId: UUID, d: AuthorOlFields) {
    return mysql`
        INSERT INTO authors_ol(author_id, olauthor_id, cover_id)
        VALUES(UNHEX(${authorId}), ${d.olid}, ${d.coverId});
    `;
}

type AuthorRemoteIdFields = Pick<RemoteId, 'source' | 'id'>;
export function createAuthorRemoteId(authorId: UUID, d: AuthorRemoteIdFields) {
    return mysql`
        INSERT INTO authors_remote_ids(author_id, source, remote_id)
        VALUES(UNHEX(${authorId}), ${d.source}, ${d.id});
    `;
}