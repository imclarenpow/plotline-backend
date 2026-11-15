-- Sources and XP: where every fact came from, and the evidence XP is computed from.

-- External identifiers. (source_id, external_id) is unique, so an ID can never
-- attach to two records; one record can have several IDs from the same source.
CREATE TABLE IF NOT EXISTS work_external_ids (
    source_id INT NOT NULL REFERENCES sources(id),
    external_id VARCHAR(255) NOT NULL,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_work_external_ids_work ON work_external_ids (work_id);

CREATE TABLE IF NOT EXISTS edition_external_ids (
    source_id INT NOT NULL REFERENCES sources(id),
    external_id VARCHAR(255) NOT NULL,
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_edition_external_ids_edition ON edition_external_ids (edition_id);

CREATE TABLE IF NOT EXISTS contributor_external_ids (
    source_id INT NOT NULL REFERENCES sources(id),
    external_id VARCHAR(255) NOT NULL,
    contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_contributor_external_ids_contributor ON contributor_external_ids (contributor_id);

-- What each source said about a work: only the fields XP uses, not raw API payloads.
-- Lets XP be recomputed for every work without calling any API.
CREATE TABLE IF NOT EXISTS work_signals (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    source_id INT NOT NULL REFERENCES sources(id),
    signals JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- set again by every upsert
    PRIMARY KEY (work_id, source_id)
);

-- Subject difficulty values. normalized_name is what incoming subjects from any source
-- are matched against.
CREATE TABLE IF NOT EXISTS subjects (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) GENERATED ALWAYS AS (lower(trim(name))) STORED UNIQUE,
    category_id INT NOT NULL REFERENCES subject_categories(id) ON DELETE CASCADE,
    value SMALLINT NOT NULL CHECK (value BETWEEN 1 AND 10) -- difficulty
);

CREATE TABLE IF NOT EXISTS work_subjects (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    source_id INT NOT NULL REFERENCES sources(id), -- which source tagged it
    PRIMARY KEY (work_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_work_subjects_subject ON work_subjects (subject_id);

-- One row per bulk import (e.g. a monthly OpenLibrary dump). See docs/imports.md.
-- An internal log nobody links to, so a plain sequential id.
CREATE TABLE IF NOT EXISTS import_runs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id INT NOT NULL REFERENCES sources(id),
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ NULL,
    stats JSONB NULL, -- counts per step
    error TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_import_runs_source ON import_runs (source_id, started_at);
