-- Authors Tables
CREATE TABLE IF NOT EXISTS authors (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    birth_date DATE,
    death_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
-- open library helper table
CREATE TABLE IF NOT EXISTS authors_ol (
    author_id BINARY(16) NOT NULL,
    olauthor_id VARCHAR(20) UNIQUE NOT NULL,
    cover_id INT NULL,
    PRIMARY KEY (olauthor_id),
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);
-- remote ids for author
CREATE TABLE IF NOT EXISTS authors_remote_ids(
    id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID(), 1)),
    author_id BINARY(16) NOT NULL,
    source VARCHAR(50) NOT NULL,
    remote_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);
-- Books Tables
CREATE TABLE IF NOT EXISTS books (
    id BINARY(16) DEFAULT (UUID_TO_BIN(UUID(), 1)),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    bio TEXT,
    number_of_pages SMALLINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    xp INT UNSIGNED NOT NULL,
    PRIMARY KEY (id)
);
-- open libary table. makes sense to have the work id as the PK.
CREATE TABLE IF NOT EXISTS books_ol (
    work_id VARCHAR(20) UNIQUE NOT NULL,
    book_id BINARY(16) NOT NULL,
    cover_id VARCHAR(20),
    PRIMARY KEY (work_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
-- remote ids for books
CREATE TABLE IF NOT EXISTS books_remote_ids(
    id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID(), 1)),
    book_id BINARY(16) NOT NULL,
    source VARCHAR(50) NOT NULL,
    remote_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
-- Join book <-1--N-> authors
CREATE TABLE IF NOT EXISTS book_authors (
    author_id BINARY(16) NOT NULL,
    book_id BINARY(16) NOT NULL,
    PRIMARY KEY (author_id, book_id),
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);