export type RemoteSource =
    "goodreads" | "librarything" | "isni" | "wikidata" |
    "viaf" | "storygraph" | "amazon" | "musicbrainz" |
    "lc_naf" | "opac_sbn" | "gnd" | "bookbrainz" |
    "imdb" | "librivox" | "project_gutenberg" | "inventaire";

export type RemoteId = {
    source: RemoteSource;
    id: string;
}

// types requiring regex validation
export type DateString = string & { __brand: "DateString" };
export type UUID = string & { __brand: "UUID" };