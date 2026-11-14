// Results returned per search.
const searchItemLimit = 20;

// When the catalog returns fewer results than this, OpenLibrary's search fills the rest.
const minCatalogResults = 5;

// InnoDB full-text search ignores words shorter than innodb_ft_min_token_size (3) and the
// words below (its default stopword list). A required (+) term that the index ignores
// matches nothing, so these are dropped from queries.
const fullTextMinWordLength = 3;
const fullTextStopwords = new Set([
    'a', 'about', 'an', 'are', 'as', 'at', 'be', 'by', 'com', 'de', 'en', 'for', 'from', 'how',
    'i', 'in', 'is', 'it', 'la', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'what',
    'when', 'where', 'who', 'will', 'with', 'und', 'www',
]);

export { searchItemLimit, minCatalogResults, fullTextMinWordLength, fullTextStopwords };
