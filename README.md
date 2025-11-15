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
