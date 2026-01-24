import { mysql } from "../../bindings/mysql.ts";

const getAuthorBooksBase = `
    SELECT b.id, b.title, b.subtitle, b.bio, b.number_of_pages, b.xp, bo.work_id, bo.cover_id
    FROM books b
    JOIN book_authors ba ON ba.book_id = b.id
    JOIN authors a ON a.id = ba.author_id
    LEFT JOIN books_ol bo ON bo.book_id = b.id
`

export function getAuthorBooksById(authorId: string) {
    return mysql`${getAuthorBooksBase}
        WHERE a.id = ${authorId}
        ORDER BY b.title`;
}

export function getAuthorBooksByName(authorName: string) {
    return mysql`${getAuthorBooksBase}
        WHERE a.name LIKE CONCAT('%', ${authorName}, '%')
        ORDER BY b.title`;
}

export function getAuthorBooksByOlid(olid: string) {
    return mysql`${getAuthorBooksBase} 
        JOIN authors_ol ao ON ao.author_id = a.id
        WHERE ao.olauthor_id = ${olid}
        ORDER BY b.title`;
}