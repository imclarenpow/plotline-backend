-- Sources and XP: where every fact came from, and the evidence XP is computed from.

-- External identifiers. (source_id, external_id) is unique, so an ID can never
-- attach to two records; one record can have several IDs from the same source.
CREATE TABLE IF NOT EXISTS work_external_ids (
    source_id INT NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    work_id BINARY(16) NOT NULL,
    PRIMARY KEY (source_id, external_id),
    INDEX idx_work_external_ids_work (work_id),
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS edition_external_ids (
    source_id INT NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    edition_id BINARY(16) NOT NULL,
    PRIMARY KEY (source_id, external_id),
    INDEX idx_edition_external_ids_edition (edition_id),
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contributor_external_ids (
    source_id INT NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    contributor_id BINARY(16) NOT NULL,
    PRIMARY KEY (source_id, external_id),
    INDEX idx_contributor_external_ids_contributor (contributor_id),
    FOREIGN KEY (source_id) REFERENCES sources(id),
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE CASCADE
);

-- What each source said about a work: only the fields XP uses, not raw API payloads.
-- Lets XP be recomputed for every work without calling any API.
CREATE TABLE IF NOT EXISTS work_signals (
    work_id BINARY(16) NOT NULL,
    source_id INT NOT NULL,
    signals JSON NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (work_id, source_id),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Subject difficulty values (was subjects_ol). normalized_name is what incoming
-- subjects from any source are matched against.
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) AS (LOWER(TRIM(name))) STORED UNIQUE,
    category_id INT NOT NULL,
    value TINYINT UNSIGNED NOT NULL, -- difficulty 1-10
    PRIMARY KEY (id),
    FOREIGN KEY (category_id) REFERENCES subject_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_subjects (
    work_id BINARY(16) NOT NULL,
    subject_id INT NOT NULL,
    source_id INT NOT NULL, -- which source tagged it
    PRIMARY KEY (work_id, subject_id),
    INDEX idx_work_subjects_subject (subject_id),
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- One row per bulk import (e.g. a monthly OpenLibrary dump). See docs/imports.md.
CREATE TABLE IF NOT EXISTS import_runs (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    source_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    stats JSON NULL, -- counts per step
    error TEXT NULL,
    PRIMARY KEY (id),
    INDEX idx_import_runs_source (source_id, started_at),
    CONSTRAINT chk_import_runs_status CHECK (status IN ('running', 'succeeded', 'failed')),
    FOREIGN KEY (source_id) REFERENCES sources(id)
);
