# Plotline Backend

A fast, modern book management API built with **Node.js** and **Fastify**.

## Quick Start

```bash
npm install
npm start
```

This starts the backend on the port specified in your `.env` file.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Environment Setup](#environment-setup)
3. [Docker & Database Setup](#docker--database-setup)
4. [API Endpoints](#api-endpoints)

---

## Project Structure

```
routes/     → API endpoints
services/   → Business logic
queries/    → Database queries
plugins/    → Fastify plugins (DB, Redis)
```

**Flow**: Routes → Services → Queries → Database

---

## Environment Setup

Create a `.env` file in the root directory with:

```env
# Database
MYSQL_DB_NAME=plotline_prd
MYSQL_ROOT_PASSWORD=rootpasswordhere
MYSQL_USER=yourusername
MYSQL_PASSWORD=yourpassword

# Redis
REDIS_PASSWORD=redispassword
REDIS_PORT=6379

# Storage
ROOT_DIR=/mnt/mediadrive/plotline
DB_DIR=${ROOT_DIR}/db/data
MYSQL_DB_DIR=${DB_DIR}/mysql
REDIS_DB_DIR=${DB_DIR}/redis

# Server
DB_HOST=192.168.1.200
BACKEND_PORT=3001
```

---

## Docker & Database Setup

### Starting the Containers

```bash
docker-compose -f db/docker/docker-compose.yml --env-file .env up -d
```

### Verify Configuration

```bash
docker-compose -f db/docker/docker-compose.yml --env-file .env config
```

### Creating the Database

Connect to MySQL:

```bash
docker exec -it plotline-mysql mysql -u root -p
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS plotline_prd;
USE plotline_prd;
```

Run SQL scripts in order:

1. `./db/creation/initial-book-tables.sql`
2. `./db/creation/initial-user-tables.sql`
3. `./db/creation/initial-shelf-tables.sql`

### Granting Remote Access (for homelab setups)

If running MySQL on a remote server, connect to the container and run:

```sql
ALTER USER 'yourusername'@'192.168.1.%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON plotline_prd.* TO 'yourusername'@'192.168.1.%';
FLUSH PRIVILEGES;
```

### Connecting from Your PC

**Using VS Code (SQLTools extension)**:
- Install `SQLTools` and `SQLTools MySQL`
- Create a new connection:
  - Host: `192.168.1.200` (your server IP)
  - Port: `3306`
  - Username: `yourusername`
  - Password: `yourpassword`
  - Database: `plotline_prd`

**Using Command Line**:
```bash
mysql -h 192.168.1.200 -u yourusername -p
```

**Using Redis**:
- Install `Redis` extension for VS Code
- Add connection with:
  - Host: your server IP
  - Port: `6379`
  - Password: from `.env` REDIS_PASSWORD

---

## API Endpoints

### GET /api/books/olid/:worksOlid

Fetches a book by its OpenLibrary work ID. If the book doesn't exist in the database, it fetches the data from OpenLibrary, creates the book record along with associated author records, and stores everything in the database.

#### Flow

1. **Check if book exists**: Query the database for a book with the given OpenLibrary work ID.

2. **If book exists**: Return the stored book record immediately.

3. **If book doesn't exist**:
   - Fetch book data from OpenLibrary API
   - Extract all author OpenLibrary IDs from the book data
   
4. **For each author**:
   - Check if the author already exists in the database (by OpenLibrary ID)
   - If author exists: use the stored author record
   - If author doesn't exist: 
     - Fetch author data from OpenLibrary API
     - Create a new author record in the database with biographical data, birth/death dates, cover images, and remote IDs (Goodreads, Wikidata, etc.)

5. **Create the book record** with:
   - Title, bio, number of pages, cover ID
   - OpenLibrary work ID and cover ID
   - Remote identifiers (BookBrainz, MusicBrainz, Wikidata, etc.)
   - Link all associated authors to the book

6. **Return** the newly created book record

#### Example Request

```
GET /api/books/olid/OL453735W
```

#### Response

```json
{
  "id": "45...94",
  "title": "Guards! Guards!",
  "bio": "Here there be dragons...",
  "number_of_pages": 300,
  "work_id": "OL453735W",
  "cover_id": 13095550,
  "authors": [
    {
      "id": "45...94",
      "name": "Terry Pratchett",
      "olauthor_id": "OL25712A"
    }
  ]
}
```

