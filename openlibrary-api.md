# Open Libary API

The API is in GraphQL, so we only request data that we require.
I also want to ensure that the name of my app and my email address is included in headers so they know who is using the API.

## Endpoints

### Search

For search we use the following url:
`https://openlibrary.org/search.json?q=query+is+written+here&fields=key,title,subtitle,first_publish_year,author_key,cover_edition_key,lang:en,subject,number_of_pages_median`
This only provides required fields and limits results to where english it the language used.

### Works

For the works endpoint, it seems to be rest, therefore we cannot request only the information we want.
We use the work id granted in the above call in order to call this api.
`https://openlibrary.org/works/{olwork_id}.json`
Here we gather the description & subjects of the book (this is to be used to gather an xp score).

### Authors

For the authors endpoint, we gather the remote_ids, get the bio & the birth & death date.
We also gather and store the remote_ids of the authors too.
`http://openlibrary.org/authors/{olauthor_id}.json`
