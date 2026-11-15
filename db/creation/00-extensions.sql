-- Extensions and shared functions. Runs first: later files use them.

-- pg_trgm: trigram similarity, for typo-tolerant search. unaccent: strips accents.
-- Both are trusted extensions, so the database owner can create them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- How text is normalised for search: lowercase, accents removed ('Astérix' -> 'asterix').
-- unaccent() itself isn't IMMUTABLE (its dictionary could change), so it can't be used
-- in an index; this wrapper pins the dictionary and is marked IMMUTABLE so it can.
CREATE OR REPLACE FUNCTION search_normalize(value text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN lower(public.unaccent('public.unaccent'::regdictionary, value));

-- Keeps updated_at current on every UPDATE (MySQL did this with ON UPDATE CURRENT_TIMESTAMP).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
