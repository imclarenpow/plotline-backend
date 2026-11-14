-- Catalog: what a book is, independent of any data source.
-- A work is the story (or a collected edition, for comics/manga);
-- an edition is a specific printing with an ISBN.

CREATE TABLE IF NOT EXISTS works (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    format_id INT NULL, -- NULL = format unknown
    first_published_year SMALLINT,
    page_count SMALLINT UNSIGNED NULL, -- canonical count; NULL = unknown, never 0
    xp INT UNSIGNED NULL, -- NULL until computed
    xp_version SMALLINT UNSIGNED NULL, -- formula version xp was computed with
    xp_updated_at TIMESTAMP NULL,
    edition_count INT UNSIGNED NOT NULL DEFAULT 0, -- search ranking; refreshed by imports
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_works_xp_version (xp_version),
    INDEX idx_works_title (title), -- exact-title search, for queries full-text ignores ("It")
    FULLTEXT INDEX ft_works_title (title, subtitle),
    FOREIGN KEY (format_id) REFERENCES formats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publishers (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255) UNIQUE NOT NULL,
    implied_format_id INT NULL, -- e.g. Viz -> manga; a cheap format signal
    PRIMARY KEY (id),
    FOREIGN KEY (implied_format_id) REFERENCES formats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS editions (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    work_id BINARY(16) NOT NULL,
    publisher_id BINARY(16) NULL,
    title VARCHAR(255), -- only when it differs from the work title
    isbn13 CHAR(13) UNIQUE,
    isbn10 CHAR(10),
    page_count SMALLINT UNSIGNED NULL,
    published_year SMALLINT,
    language CHAR(3), -- ISO 639-2, as used by OpenLibrary (e.g. 'eng')
    cover_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_editions_work (work_id),
    INDEX idx_editions_isbn10 (isbn10),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contributors (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    birth_date DATE,
    death_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_contributors_name (name),
    FULLTEXT INDEX ft_contributors_name (name)
);

-- work <-N--N-> contributors, one row per role (a person can write and draw).
CREATE TABLE IF NOT EXISTS work_contributors (
    work_id BINARY(16) NOT NULL,
    contributor_id BINARY(16) NOT NULL,
    role_id INT NOT NULL,
    position TINYINT UNSIGNED NOT NULL DEFAULT 0, -- display order
    PRIMARY KEY (work_id, contributor_id, role_id),
    INDEX idx_work_contributors_contributor (contributor_id),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES contributor_roles(id)
);

CREATE TABLE IF NOT EXISTS series (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255) NOT NULL,
    format_id INT NULL,
    PRIMARY KEY (id),
    INDEX idx_series_name (name),
    FOREIGN KEY (format_id) REFERENCES formats(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_series (
    work_id BINARY(16) NOT NULL,
    series_id BINARY(16) NOT NULL,
    position DECIMAL(6, 2) NULL, -- e.g. Vol. 3, Vol. 3.5
    PRIMARY KEY (work_id, series_id),
    INDEX idx_work_series_order (series_id, position),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE
);
