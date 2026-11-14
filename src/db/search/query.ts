// Turns what a user typed into a Postgres tsquery: every word required, and each word
// matched as a prefix so partly typed words still match ("harry pott" -> "harry:* & pott:*").
// Only letters and digits survive, so input can never inject tsquery operators. Accents and
// case are normalised in SQL by search_normalize(), the same function the index uses.
// Returns null when there are no words, since an empty query matches nothing.
export function toTsQuery(input: string): string | null {
    const words = input
        .normalize('NFKC')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    const unique = [...new Set(words)].slice(0, 10);
    return unique.length ? unique.map(w => `${w}:*`).join(' & ') : null;
}
