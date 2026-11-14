import { fullTextMinWordLength, fullTextStopwords } from '../../config/search.ts';

// Turns what a user typed into a MySQL BOOLEAN MODE query: every word required, and each
// word matched as a prefix so partly typed words still match ("harry pott" -> "+harry* +pott*").
// Returns null when no word is usable (e.g. "It"), since an empty query matches nothing.
export function toBooleanQuery(input: string): string | null {
    const words = input
        .normalize('NFKC')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(w => w.length >= fullTextMinWordLength && !fullTextStopwords.has(w));
    const unique = [...new Set(words)].slice(0, 10);
    return unique.length ? unique.map(w => `+${w}*`).join(' ') : null;
}
