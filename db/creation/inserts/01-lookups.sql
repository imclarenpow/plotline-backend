-- Formats. Densities are starting guesses; calibrate against real books.
INSERT INTO formats (name, density)
VALUES ('prose', 1.00),
    ('comic', 0.60),
    ('manga', 0.35),
    ('picture_book', 0.20);

INSERT INTO contributor_roles (name)
VALUES ('author'),
    ('writer'),
    ('artist'),
    ('penciller'),
    ('inker'),
    ('colourist'),
    ('letterer'),
    ('illustrator'),
    ('editor'),
    ('translator');

-- Data providers. Check licences before monetising; commercial_ok NULL = unverified.
INSERT INTO sources (name, provides_data, priority, license, commercial_ok, attribution)
VALUES ('community', TRUE, 100, NULL, TRUE, NULL),
    ('gcd', TRUE, 80, 'CC BY-SA 4.0', TRUE, 'Comic data from the Grand Comics Database (comics.org), licensed CC BY-SA 4.0.'),
    ('google_books', TRUE, 60, 'Google APIs Terms of Service', TRUE, 'Powered by Google Books.'),
    ('wikidata', TRUE, 50, 'CC0', TRUE, NULL),
    ('openlibrary', TRUE, 40, NULL, NULL, 'Book data from Open Library (openlibrary.org).');

-- Identifier-only namespaces (cross-references returned by OpenLibrary).
INSERT INTO sources (name)
VALUES ('goodreads'),
    ('librarything'),
    ('isni'),
    ('viaf'),
    ('storygraph'),
    ('amazon'),
    ('musicbrainz'),
    ('lc_naf'),
    ('opac_sbn'),
    ('gnd'),
    ('bookbrainz'),
    ('imdb'),
    ('librivox'),
    ('project_gutenberg'),
    ('inventaire');
