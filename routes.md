# Routes

This file gives a simple overview of what each API route does.

Base URL example:

`http://localhost:3001`

## Test and Debug Routes

### `GET /api/test/mysql`

Checks the backend can talk to MySQL.

What happens:
- Runs a simple `SELECT 1 AS ok` query.
- Returns the database result if the connection works.

Useful for:
- Confirming the MySQL connection details are correct.
- Quickly testing whether MySQL is reachable from the backend.

### `GET /api/test/redis`

Checks the backend can talk to Redis.

What happens:
- Sends a Redis `PING` command.
- Returns the Redis response, usually `PONG`, if the connection works.

Useful for:
- Confirming the Redis connection details are correct.
- Quickly testing whether Redis is reachable from the backend.

### `GET /api/debug/redis-flush`

Clears everything currently stored in Redis.

What happens:
- Sends `FLUSHALL` to Redis.
- On success, returns a JSON message saying the cache was purged.
- On failure, returns a JSON error with status `500`.

Useful for:
- Clearing cached API results during development.

Important:
- This removes all Redis data, not just one cached key.

## Search Routes

### `GET /api/search/:query`

Searches Open Library for books matching the text in `:query`.

Example:

`GET /api/search/harry%20potter`

What happens:
- Checks Redis first to see if this search query was already cached.
- If cached, returns the cached JSON immediately.
- If not cached, sends a search request to Open Library.
- Limits results using the app's configured search limit, which is currently `20`.
- Stores the returned JSON in Redis for later requests.
- Returns the search JSON to the client.

Useful for:
- Search screens.
- Autocomplete or discovery features.

Failure behavior:
- If Open Library fails or another error is thrown, the route returns a JSON error with status `500`.
    - AGENT CHANGES: when open library isn't reachable, a `503` status should be returned as well as a json payload response such as "Open Library API unreachable/unresponsive" should be returned.
    - AGENT CHANGES: for other errors, `500` should continue to be returned.

### `GET /api/books/:query`

Fetches a single Open Library work by its work ID.

Example:

`GET /api/books/OL82563W`

What happens:
- Treats `:query` as an Open Library work ID.
- Checks Redis first to see if this work was already cached.
- If cached, returns the cached JSON immediately.
- If not cached, validates that the ID looks like a valid Open Library work ID.
- Fetches the work from Open Library at `/works/{id}.json`.
- AGENT CHANGES: fetches the editions from Open Library at `/works/{id}.json`.
- Stores the returned JSON in Redis for later requests.
- Returns the work JSON to the client.

Useful for:
- Book detail pages.
- Fetching full metadata for a selected work.

Failure behavior:
- If the work ID is invalid, Open Library fails, or another error is thrown, the route returns a JSON error with status `500`.
    - AGENT CHANGES: when open library isn't reachable, a `503` status should be returned as well as a json payload response such as "Open Library API unreachable/unresponsive" should be returned.
    - AGENT CHANGES: for other errors, `500` should continue to be returned.

## Notes

- The route handlers in this project return JSON for the search, book, and debug responses.
- The search and book routes use Redis caching to avoid repeating the same Open Library requests.
- The two test routes are mainly for checking infrastructure connectivity during development.