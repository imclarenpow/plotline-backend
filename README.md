# Plotline Backend

Using node & fastify.
Fastify is supposed to be faster and ify-er than express so we're giving this a shot.
To run, install dependencies `npm install`, then run `node server.js` this will start the backend.
(Probably need a better way of doing this)

## Structure

Endpoint starts in `routes`.
Routes call methods from `services` which in turn call queries from `queries`.

## Endpoints

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
# Plotline DB

This is the folder containing db information and scripts.

## Setting up the Container

Set up the DB where you want. I've made a docker container because this is the easiest way to get the DBs setup.

You need to create `.env` in the root. It also has data for the server too.
Here is the template:
``` yml
# DB Details
MYSQL_DB_NAME=plotline_prd # keep this the same. this is whatever DB is being used.
MYSQL_ROOT_PASSWORD=rootpasswordhere
MYSQL_USER=yourusername
MYSQL_PASSWORD=yourpassword
REDIS_PASSWORD=redispassword
REDIS_PORT=6397

ROOT_DIR=/mnt/mediadrive/plotline # this dir is wherever you want your db to be stored on the system.
DB_DIR=${ROOT_DIR}/db/data
MYSQL_DB_DIR=${DB_DIR}/mysql
REDIS_DB_DIR=${DB_DIR}/redis

# DB Host
DB_HOST=192.168.1.200 # this probably should be localhost if you set up the containers on your machine.

# Backend
BACKEND_PORT=3001
```

Then you need to add the pw

From the root run
`docker-compose -f db/docker/docker-compose.yml --env-file .env config`

## Accessing MySQL locally

I'm running my db on my homelab. In order to gain access I've done 2 things. First I log into the container via SSH then I ran the following commands as the root user:
`ALTER USER 'username'@'192.168.1.%' IDENTIFIED BY 'password';`
`GRANT ALL PRIVILEGES ON plotline_prd.* TO 'username'@'192.168.1.%';` Note: add the exact db to be clearer. You might want to run the first step of creating the DB beforehand in order to select the db
`FLUSH PRIVILEGES;`

Once I'd done that I installed the SQLTools and SQLTools MariaDB, MySQL, TiDB extensions.
Then I opened SQLTools → “New Connection”.

- Fill in:
- Connection Name: Plotline MySQL
- Server/Host: 192.168.1.200 (my server IP)
- Port: 3306
- Username: username
- Password: password
- Database: plotline_prd (this is the one i'm using for now)
- Tested the connection.

Then I went ahead and looked at my SQL scripts to see if I could run them and I could so that is cool.

## Creating the Database

Create a new db:
`CREATE DATABASE IF NOT EXISTS plotline_prd;`
`USE plotline_prd;`
Then run the scripts in this order:

1. `./creation/initial-book-tables.sql`
2. `./creation/initial-user-tables.sql`
3. `./creation/initial-shelf-tables.sql`
