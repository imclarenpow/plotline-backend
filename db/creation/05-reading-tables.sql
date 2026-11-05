-- Shelves, reading history and difficulty ratings.

CREATE TABLE IF NOT EXISTS shelves (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    owner_id BINARY(16) NOT NULL,
    name VARCHAR(50) NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id BINARY(16) NOT NULL,
    work_id BINARY(16) NOT NULL,
    edition_id BINARY(16) NULL, -- the edition the user owns, if known
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shelf_id, work_id),
    INDEX idx_shelf_items_work (work_id),
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE SET NULL
);

-- One row per read, so re-reads are separate rows.
-- xp_awarded is snapshotted on finish so formula changes never alter earned plotpoints.
CREATE TABLE IF NOT EXISTS user_reads (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    user_id BINARY(16) NOT NULL,
    work_id BINARY(16) NOT NULL,
    edition_id BINARY(16) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reading',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    xp_awarded INT UNSIGNED NULL,
    xp_version SMALLINT UNSIGNED NULL,
    PRIMARY KEY (id),
    INDEX idx_user_reads_user_status (user_id, status),
    INDEX idx_user_reads_work (work_id),
    CONSTRAINT chk_user_reads_status CHECK (status IN ('reading', 'finished', 'dnf')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
    FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE SET NULL
);

-- Plotline's own difficulty data; blended into XP once a work has enough ratings.
CREATE TABLE IF NOT EXISTS difficulty_ratings (
    user_id BINARY(16) NOT NULL,
    work_id BINARY(16) NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, work_id),
    INDEX idx_difficulty_ratings_work (work_id),
    CONSTRAINT chk_difficulty_rating CHECK (rating BETWEEN 1 AND 5),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);
