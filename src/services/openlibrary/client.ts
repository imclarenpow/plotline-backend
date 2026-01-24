import * as ol from '../../config/openlibrary.ts';
import type { CoverSize } from '../../config/openlibrary.ts';
import type { Book } from '../../db/books/types.ts';
import type { Author } from '../../db/authors/types.ts';

export async function getWork(workId: Book['workId']): Promise<any> {
    const res = await fetch(`${ol.URL}/works/${workId}.json`, { headers: ol.userAgent });
    if (!res.ok) throw new Error(`Failed to fetch work data for workId: ${workId}`);
    return await res.json();
}

export async function getAuthor(authorId: Author['olid']): Promise<any> {
    const res = await fetch(`${ol.URL}/authors/${authorId}.json`, { headers: ol.userAgent });
    if (!res.ok) throw new Error(`Failed to fetch author ${authorId}: ${res.status}`);
    return await res.json();
}

export async function getBookCover(coverId: Book['coverId'], size: CoverSize): Promise<string> {
    // should really validate size in future using zod or similar.
    return `${ol.BOOK_COVERS_URL}/${coverId}-${size}`;
}

export async function getAuthorCover(coverId: Author['coverId'], size: CoverSize): Promise<string> {
    // same as above comment
    return `${ol.AUTHOR_COVERS_URL}/${coverId}-${size}`;
}

export async function search(query: string, number_returned: number): Promise<any> {
    console.log('[OPENLIBRARY] Searching for:', query, 'with limit:', number_returned);
    const url = `${ol.URL}/search.json?q=${encodeURIComponent(query)}&fields=${ol.SEARCH_PARAMS}&limit=${number_returned}`;
    console.log('[OPENLIBRARY] API URL:', url);
    
    try {
        const res = await fetch(url);
        console.log('[OPENLIBRARY] API response status:', res.status);
        
        if (!res.ok) throw new Error(`Failed to search for ${query}: ${res.status}`);
        
        const data = await res.json();
        console.log('[OPENLIBRARY] API returned', data?.docs?.length || 0, 'results');
        
        return data;
    } catch (error) {
        console.error('[OPENLIBRARY] Search error:', error);
        throw error;
    }
}