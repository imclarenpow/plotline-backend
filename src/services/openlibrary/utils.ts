import { bookCoverUrlById } from '../../config/openlibrary.ts';
import { SearchDocSchema } from '../../schemas/openlibrary.ts';
import type { SearchResult } from '../../schemas/search.ts';

// Any OpenLibrary key to its bare ID: '/works/OL123W' -> 'OL123W', '/authors/OL1A' -> 'OL1A'.
export function olId(key: string): string {
    return key.slice(key.lastIndexOf('/') + 1);
}

// Maps an OpenLibrary search.json payload to search results. Docs that don't validate are skipped.
export function toSearchResults(payload: unknown): SearchResult[] {
    const docs = (payload as { docs?: unknown })?.docs;
    const results: SearchResult[] = [];
    for (const raw of Array.isArray(docs) ? docs : []) {
        const parsed = SearchDocSchema.safeParse(raw);
        if (!parsed.success) continue;
        const doc = parsed.data;
        results.push({
            id: null,
            olid: olId(doc.key),
            title: doc.title,
            subtitle: doc.subtitle ?? null,
            authors: doc.author_name ?? [],
            firstPublishedYear: doc.first_publish_year ?? null,
            coverUrl: doc.cover_i ? bookCoverUrlById(doc.cover_i) : null,
            source: 'openlibrary',
        });
    }
    return results;
}
