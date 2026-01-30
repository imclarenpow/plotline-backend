import * as ol from '../../config/openlibrary.ts';
import { CoverSizeSchema } from '../../schemas/openlibrary.ts';
import { BookSchema } from '../../schemas/books.ts';
import { AuthorOlidSchema, WorkOlidSchema } from '../../schemas/openlibrary.ts';

export async function getWork(workId: string): Promise<any> {
    const validated = WorkOlidSchema.safeParse(workId);
    if (!validated.success) { throw new Error(`Invalid work ID: ${workId}`); }

    const res = await fetch(`${ol.URL}/works/${workId}.json`, { headers: ol.userAgent });
    if (!res.ok) throw new Error(`Failed to fetch work data for workId: ${workId}`);
    return await res.json();
}

export async function getAuthor(authorId: string): Promise<any> {
    const validated = AuthorOlidSchema.safeParse(authorId);
    if (!validated.success) { throw new Error(`Invalid author ID: ${authorId}`); }

    const res = await fetch(`${ol.URL}/authors/${authorId}.json`, { headers: ol.userAgent });
    if (!res.ok) throw new Error(`Failed to fetch author ${authorId}: ${res.status}`);
    return await res.json();
}

export async function getBookCover(coverId: number, size: string): Promise<string> {
    const validated = CoverSizeSchema.safeParse(size);
    if (!validated.success) { throw new Error(`Invalid cover size: ${size}`); }

    return `${ol.BOOK_COVERS_URL}/${coverId}-${size}`;
}

export async function getAuthorCover(coverId: string, size: string): Promise<string> {
    const validated = CoverSizeSchema.safeParse(size);
    if (!validated.success) { throw new Error(`Invalid cover size: ${size}`); }
    return `${ol.AUTHOR_COVERS_URL}/${coverId}-${size}`;
}

export async function search(query: string, number_returned: number): Promise<any> {
    const url = `${ol.URL}/search.json?q=${encodeURIComponent(query)}&fields=${ol.SEARCH_PARAMS}&limit=${number_returned}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to search for ${query}: ${res.status}`);
        const data = await res.json() as { docs?: any[] };
        return data;
    } catch (error) {
        throw error;
    }
}