import * as ol from '../../config/openlibrary.ts';
import { CoverSizeSchema } from '../../schemas/openlibrary.ts';
import { AuthorOlidSchema, WorkOlidSchema } from '../../schemas/openlibrary.ts';
import { HttpError } from '../../utils/api.ts';

export const UNREACHABLE = 'Open Library API unreachable';

// Network failures, timeouts, rate limits and 5xx answers mean OpenLibrary can't serve us
// right now (503). A 404 returns null so callers can tell "doesn't exist" from "failed".
async function fetchJson(url: string, what: string): Promise<any | null> {
    let res: Response;
    try {
        res = await fetch(url, { headers: ol.userAgent, signal: AbortSignal.timeout(ol.TIMEOUT_MS) });
    } catch {
        throw new HttpError(503, UNREACHABLE);
    }
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) throw new HttpError(503, UNREACHABLE);
    if (!res.ok) throw new Error(`Failed to fetch ${what}: ${res.status}`);
    return await res.json();
}

// null when OpenLibrary has no such work.
export async function getWork(workId: string): Promise<any | null> {
    if (!WorkOlidSchema.safeParse(workId).success) throw new HttpError(400, `Invalid work ID: ${workId}`);
    return fetchJson(`${ol.URL}/works/${workId}.json`, `work ${workId}`);
}

// { entries: [...] }, or null when OpenLibrary has no such work.
export async function getEditions(workId: string): Promise<any | null> {
    if (!WorkOlidSchema.safeParse(workId).success) throw new HttpError(400, `Invalid work ID: ${workId}`);
    return fetchJson(`${ol.URL}/works/${workId}/editions.json?limit=100`, `editions of ${workId}`);
}

// null when OpenLibrary has no such author.
export async function getAuthor(authorId: string): Promise<any | null> {
    if (!AuthorOlidSchema.safeParse(authorId).success) throw new HttpError(400, `Invalid author ID: ${authorId}`);
    return fetchJson(`${ol.URL}/authors/${authorId}.json`, `author ${authorId}`);
}

export async function getBookCover(coverId: number, size: string): Promise<string> {
    const validated = CoverSizeSchema.safeParse(size);
    if (!validated.success) { throw new Error(`Invalid cover size: ${size}`); }

    return `${ol.BOOK_COVERS_URL}${coverId}-${size}.jpg`;
}

export async function getAuthorCover(coverId: string, size: string): Promise<string> {
    const validated = CoverSizeSchema.safeParse(size);
    if (!validated.success) { throw new Error(`Invalid cover size: ${size}`); }
    return `${ol.AUTHOR_COVERS_URL}${coverId}-${size}.jpg`;
}

export async function search(query: string, number_returned: number): Promise<any> {
    const url = `${ol.URL}/search.json?q=${encodeURIComponent(query)}&fields=${ol.SEARCH_PARAMS}&limit=${number_returned}`;
    return (await fetchJson(url, `search for ${query}`)) ?? { docs: [] };
}
