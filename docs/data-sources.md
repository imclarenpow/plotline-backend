# Data sources

Plotline must stay **free to monetise**, so every provider has to allow commercial use. Check a provider's current terms before building on it: terms change, and this page is a summary, not legal advice.

Each provider is a row in the `sources` table (`db/creation/inserts/01-lookups.sql`) with its licence, `commercial_ok`, attribution text and `priority`. Keep that table and this page in sync.

## Providers

| Source | Status | Licence / terms | Commercial | Used for |
|---|---|---|---|---|
| **OpenLibrary** | In use | Open data; terms not yet verified for commercial use. API guidelines: not for bulk or high-traffic commercial use; use the monthly dumps | Unverified | Works, editions, authors and subjects, imported from the monthly dumps ([imports.md](imports.md)). The live API is only a fallback for search and book pages |
| **Grand Comics Database (GCD)** | Planned | CC BY-SA 4.0: attribution required; shared derivatives must use the same licence | Yes | Western comics: page counts, story types, genre, reprint links. Loaded from data dumps into a separate `gcd` database |
| **Wikidata** | Planned | CC0 | Yes | Format (P31 "instance of", P7937 "form of creative work"), genre, awards. Links straight from OpenLibrary IDs via P648 |
| **Google Books** | Planned | Google APIs Terms of Service | Yes, with their attribution and caching rules | Page counts and BISAC categories by ISBN (e.g. "Comics & Graphic Novels / Manga") |
| **Community** | Planned | Plotline's own data | Yes | Difficulty ratings and format corrections from users. Highest priority |

## Rejected

| Source | Why |
|---|---|
| **Hardcover** | API rules restrict paid or ad-supported projects to their own ratings, not book data |
| **AniList** | Free only under $150/month revenue; also bans storing data, mass collection, and trackers similar to AniList (Plotline is one). Could be added later with a commercial licence |
| **Comic Vine** | Non-commercial use only |
| **Metron** | No published terms on commercial use. Ask the maintainers before using it |
| **Goodreads, StoryGraph, League of Comic Geeks** | No public API; scraping is against their terms |
| **Lexile / ATOS** | Licensed, no free API |

## Rules

- **Store only what XP needs** in `work_signals`, not whole API responses. This also keeps within caching rules such as Google's.
- **Show attribution** wherever a source's data appears. The text is in `sources.attribution`.
- **Bulk data comes from dumps, never by crawling an API.** OpenLibrary asks for this explicitly, and may rate-limit or block clients that ignore it.
- **The User-Agent sent to OpenLibrary** is built from `APP_NAME` + `APP_EMAIL_CONTACT`.
