-- Shelves, reading history and difficulty ratings.

CREATE TABLE IF NOT EXISTS shelves (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shelves_owner ON shelves (owner_id);
CREATE OR REPLACE TRIGGER shelves_updated_at BEFORE UPDATE ON shelves FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    edition_id UUID NULL REFERENCES editions(id) ON DELETE SET NULL, -- the edition the user owns, if known
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (shelf_id, work_id)
);
CREATE INDEX IF NOT EXISTS idx_shelf_items_work ON shelf_items (work_id);

-- One row per read, so re-reads are separate rows.
-- xp_awarded is snapshotted on finish so formula changes never alter earned plotpoints.
CREATE TABLE IF NOT EXISTS user_reads (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    edition_id UUID NULL REFERENCES editions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reading' CHECK (status IN ('reading', 'finished', 'dnf')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ NULL,
    xp_awarded INT NULL CHECK (xp_awarded >= 0),
    xp_version SMALLINT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_reads_user_status ON user_reads (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reads_work ON user_reads (work_id);

-- Plotline's own difficulty data; blended into XP once a work has enough ratings.
CREATE TABLE IF NOT EXISTS difficulty_ratings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, work_id)
);
CREATE INDEX IF NOT EXISTS idx_difficulty_ratings_work ON difficulty_ratings (work_id);
CREATE OR REPLACE TRIGGER difficulty_ratings_updated_at BEFORE UPDATE ON difficulty_ratings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
