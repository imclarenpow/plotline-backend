// Results returned per search.
const searchItemLimit = 20;

// When the catalog returns fewer results than this, OpenLibrary's search fills the rest.
const minCatalogResults = 5;

// Full-text matches ranked per query. A very common word ("the") matches a large share of the
// catalog, and ranking every match would grow with the catalog; past this many, an arbitrary
// subset is ranked. Exact titles are looked up separately, so they're never lost to the cap.
const maxRankedCandidates = 2000;

// Typo-tolerant matching (pg_trgm) only runs when nothing matched exactly, and only for
// queries at least this many characters long: short queries ("dune") match too loosely, and
// weak fuzzy results would also stop the OpenLibrary fallback from finding the real book.
const fuzzyMinLength = 5;

// pg_trgm word similarity needed for a typo match (0-1). "tolkein" vs "Tolkien" scores 0.50,
// so the extension's default of 0.6 is too strict.
const fuzzyThreshold = 0.45;

export { searchItemLimit, minCatalogResults, maxRankedCandidates, fuzzyMinLength, fuzzyThreshold };
