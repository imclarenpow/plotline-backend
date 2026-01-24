import { mysql } from "../../bindings/mysql.ts";
import type { Author } from "../types.ts";

export function getAuthorByOlid(olid: Author['olid']) {
    return mysql`
        SELECT a.id, a.name, a.bio, a.birth_date, a.death_date, ao.olauthor_id
        FROM authors a
        JOIN authors_ol ao ON ao.author_id = a.id
        WHERE ao.olauthor_id = ${olid};
    `;
}

export function getAuthorById(authorId: Author['id']) {
    return mysql`
        SELECT a.id, a.name, a.bio, a.birth_date, a.death_date, ao.olauthor_id
        FROM authors a
        JOIN authors_ol ao ON ao.author_id = a.id
        WHERE a.id = ${authorId};
    `;
}