// Turns what a user typed into a Postgres tsquery. Every word is required; only the last word
// is matched as a prefix, since that's the one still being typed ("harry pott" ->
// "harry & pott:*"). Prefix-matching every word would make each one a broad index scan.
// Only letters and digits survive, so input can never inject tsquery operators. Accents and
// case are normalised in SQL by search_normalize(), the same function the index uses.
// Returns null when there are no words, since an empty query matches nothing.
export function toTsQuery(input: string): string | null {
    const words = searchWords(input);
    if (!words.length) return null;
    return words.map((w, i) => (i === words.length - 1 ? `${w}:*` : w)).join(' & ');
}

// The words of a query, lowercased, in order, without repeats.
export function searchWords(input: string): string[] {
    const words = input
        .normalize('NFKC')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean);
    return [...new Set(words)].slice(0, 10);
}
