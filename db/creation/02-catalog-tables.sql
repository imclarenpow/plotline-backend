-- Catalog: what a book is, independent of any data source.
-- A work is the story (or a collected edition, for comics/manga);
-- an edition is a specific printing with an ISBN.
--
-- Entity ids are UUIDv7 (time-ordered, so inserts stay at the end of the index). The app
-- usually generates them with newUuid(); uuidv7() is the default for rows created in SQL.

CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    format_id INT NULL REFERENCES formats(id) ON DELETE SET NULL, -- NULL = format unknown
    first_published_year SMALLINT,
    page_count INT NULL CHECK (page_count BETWEEN 1 AND 65535), -- canonical count; NULL = unknown, never 0
    xp INT NULL CHECK (xp >= 0), -- NULL until computed
    xp_version SMALLINT NULL, -- formula version xp was computed with
    xp_updated_at TIMESTAMPTZ NULL,
    edition_count INT NOT NULL DEFAULT 0, -- search ranking; refreshed when an import finishes
    -- Title search: words (full-text) and typo-tolerant similarity (trigrams). See docs/api.md.
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('simple', search_normalize(title || ' ' || coalesce(subtitle, '')))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_works_xp_version ON works (xp_version);
CREATE INDEX IF NOT EXISTS idx_works_search ON works USING GIN (search_vector);
-- Exact-title lookups, and typo-tolerant title matching (pg_trgm word similarity).
CREATE INDEX IF NOT EXISTS idx_works_title_normalized ON works (search_normalize(title));
CREATE INDEX IF NOT EXISTS idx_works_title_trgm ON works USING GIN (search_normalize(title) gin_trgm_ops);
CREATE OR REPLACE TRIGGER works_updated_at BEFORE UPDATE ON works FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS publishers (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name VARCHAR(255) UNIQUE NOT NULL,
    implied_format_id INT NULL REFERENCES formats(id) ON DELETE SET NULL -- e.g. Viz -> manga; a cheap format signal
);

CREATE TABLE IF NOT EXISTS editions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    publisher_id UUID NULL REFERENCES publishers(id) ON DELETE SET NULL,
    title VARCHAR(255), -- only when it differs from the work title
    isbn13 CHAR(13) UNIQUE,
    isbn10 CHAR(10),
    page_count INT NULL CHECK (page_count BETWEEN 1 AND 65535),
    published_year SMALLINT,
    language CHAR(3), -- ISO 639-2, as used by OpenLibrary (e.g. 'eng')
    cover_url VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_editions_work ON editions (work_id);
CREATE INDEX IF NOT EXISTS idx_editions_isbn10 ON editions (isbn10);
CREATE OR REPLACE TRIGGER editions_updated_at BEFORE UPDATE ON editions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS contributors (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    birth_date DATE,
    death_date DATE,
    -- Author search, normalised the same way as works.search_vector.
    search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', search_normalize(name))) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contributors_name ON contributors (name);
CREATE INDEX IF NOT EXISTS idx_contributors_search ON contributors USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_contributors_name_trgm ON contributors USING GIN (search_normalize(name) gin_trgm_ops);
CREATE OR REPLACE TRIGGER contributors_updated_at BEFORE UPDATE ON contributors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- work <-N--N-> contributors, one row per role (a person can write and draw).
CREATE TABLE IF NOT EXISTS work_contributors (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES contributor_roles(id),
    position SMALLINT NOT NULL DEFAULT 0, -- display order
    PRIMARY KEY (work_id, contributor_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_work_contributors_contributor ON work_contributors (contributor_id);

CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name VARCHAR(255) NOT NULL,
    format_id INT NULL REFERENCES formats(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_series_name ON series (name);

CREATE TABLE IF NOT EXISTS work_series (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    position NUMERIC(6, 2) NULL, -- e.g. Vol. 3, Vol. 3.5
    PRIMARY KEY (work_id, series_id)
);
CREATE INDEX IF NOT EXISTS idx_work_series_order ON work_series (series_id, position);
