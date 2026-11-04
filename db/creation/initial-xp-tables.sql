-- reference table for categories of subjects.
CREATE TABLE IF NOT EXISTS categories_ol (
    id INT AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    weight FLOAT NOT NULL,
    PRIMARY KEY (id)
);
-- Setup for initial XP tables
CREATE TABLE IF NOT EXISTS subjects_ol (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255) UNIQUE NOT NULL,
    category_id INT NOT NULL,
    value INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (category_id) REFERENCES categories_ol(id) ON DELETE CASCADE
);