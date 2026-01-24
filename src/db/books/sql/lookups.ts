import { mysql } from '../../bindings/mysql.ts';
import type { Book } from '../types.ts';

export function getBooksByWorkId(workId: Book['workId']) {
    return mysql`
        SELECT b.id, b.title, b.subtitle, b.bio, b.number_of_pages, b.xp, bo.cover_id, bo.work_id
        FROM books b
        JOIN books_ol bo ON bo.book_id = b.id
        WHERE bo.work_id = ${workId};
    `;
}