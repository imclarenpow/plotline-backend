-- Lookup tables: small reference data with INT ids.
-- Tuned with UPDATEs rather than schema changes. Seeded by inserts/01-lookups.sql.

-- Book formats. density is the XP multiplier applied to page count.
CREATE TABLE IF NOT EXISTS formats (
    id INT AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,
    density DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
    PRIMARY KEY (id)
);

-- Roles a contributor can have on a work (author, writer, artist, ...).
CREATE TABLE IF NOT EXISTS contributor_roles (
    id INT AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,
    PRIMARY KEY (id)
);

-- Data providers and identifier namespaces.
-- provides_data = FALSE means the source is only an ID namespace (e.g. goodreads).
-- priority: when sources disagree on a field, the higher priority wins.
-- commercial_ok: NULL = not yet verified.
CREATE TABLE IF NOT EXISTS sources (
    id INT AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,
    provides_data BOOLEAN NOT NULL DEFAULT FALSE,
    priority TINYINT UNSIGNED NOT NULL DEFAULT 0,
    license VARCHAR(50),
    commercial_ok BOOLEAN,
    attribution TEXT,
    PRIMARY KEY (id)
);

-- Subject categories and how strongly each reflects reading difficulty. See docs/xp.md.
CREATE TABLE IF NOT EXISTS subject_categories (
    id INT AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL,
    weight DECIMAL(4, 2) NOT NULL,
    PRIMARY KEY (id)
);
