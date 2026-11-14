import { expect, test } from 'bun:test';
import { afterAllDb, describeDb } from '../testing.ts';
import { pg } from '../bindings/postgres.ts';
import { isbn10To13 } from '../../import/isbn.ts';
import * as works from '../works/repo.ts';
import * as contributors from '../contributors/repo.ts';
import { searchCatalog } from '../search/repo.ts';
import * as imports from './repo.ts';

// Integration tests against the live dev database. IDs use a unique suffix and everything
// created is deleted afterwards (deleting a work cascades to its editions, links and IDs).
const suffix = `${Date.now()}`.slice(-7) + `${Math.floor(Math.random() * 100)}`.padStart(2, '0');
const workOlid = `OL9${suffix}W`;
const authorOlid = `OL9${suffix}A`;
const editionOlid = `OL9${suffix}M`;
const duplicateOlid = `OL8${suffix}M`;
const word = `zqx${suffix}`; // a title word no real book has
// A valid ISBN-13 that no real edition is likely to have.
const isbn13 = isbn10To13(`${suffix}`.padStart(9, '0').slice(0, 9) + '0');
const publisher = `Plotline Test Press ${suffix}`;

describeDb("imports repo", () => {
    afterAllDb(async () => {
        const work = await works.getWorkByExternalId('openlibrary', workOlid);
        if (work) await works.deleteWork(work.id);
        const author = await contributors.getContributorByExternalId('openlibrary', authorOlid);
        if (author) await contributors.deleteContributor(author.id);
        await pg`DELETE FROM publishers WHERE name = ${publisher}`;
    });

    test("importWorks creates works with their external ID and signals", async () => {
        const result = await imports.importWorks('openlibrary', [{
            externalId: workOlid, title: `Plotline ${word}`, subtitle: null, description: null,
            firstPublishedYear: null, signals: { subjects: ['Comic books, strips, etc'] },
        }]);
        expect(result).toEqual({ created: 1, updated: 0, skipped: 0 });

        const work = await works.getWorkByExternalId('openlibrary', workOlid);
        expect(work?.title).toBe(`Plotline ${word}`);
        expect((await works.getWorkSignals(work!.id))[0]?.signals).toEqual({ subjects: ['Comic books, strips, etc'] });
    });

    test("re-importing fills empty fields but never replaces existing ones", async () => {
        const result = await imports.importWorks('openlibrary', [{
            externalId: workOlid, title: 'A different title', subtitle: 'Now with a subtitle', description: null,
            firstPublishedYear: 2012, signals: null,
        }]);
        expect(result).toEqual({ created: 0, updated: 1, skipped: 0 });

        const work = await works.getWorkByExternalId('openlibrary', workOlid);
        expect(work?.title).toBe(`Plotline ${word}`);
        expect(work?.subtitle).toBe('Now with a subtitle');
        expect(work?.firstPublishedYear).toBe(2012);
    });

    test("importContributors and importWorkContributors link authors in order", async () => {
        await imports.importContributors('openlibrary', [{
            externalId: authorOlid, name: `Author ${word}`, bio: null, birthDate: '1920-10-08', deathDate: null,
            otherIds: [{ source: 'wikidata', id: `Q9${suffix}` }],
        }]);
        const author = await contributors.getContributorByExternalId('openlibrary', authorOlid);
        expect(author?.birthDate).toBe('1920-10-08');
        expect(author?.externalIds).toContainEqual({ source: 'wikidata', id: `Q9${suffix}` });

        const result = await imports.importWorkContributors('openlibrary', [{
            workExternalId: workOlid, contributorExternalIds: [authorOlid, 'OL1nonexistentA'], role: 'author',
        }]);
        expect(result).toEqual({ created: 1, updated: 0, skipped: 1 });
        const linked = await works.getWorksByContributor(author!.id);
        expect(linked.map(w => w.title)).toEqual([`Plotline ${word}`]);
    });

    test("importEditions merges editions that share an ISBN and skips unknown works", async () => {
        const edition = {
            externalId: editionOlid, workExternalId: workOlid, isbn13, isbn10: null, pageCount: null,
            publishedYear: 2012, language: 'eng', coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
            publisher, otherIds: [{ source: 'goodreads' as const, id: `9${suffix}` }],
        };
        const result = await imports.importEditions('openlibrary', [
            edition,
            { ...edition, externalId: duplicateOlid, pageCount: 160 },
            { ...edition, externalId: `OL7${suffix}M`, workExternalId: 'OL1nonexistentW' },
        ]);
        expect(result).toEqual({ created: 1, updated: 1, skipped: 1 });

        const work = await works.getWorkByExternalId('openlibrary', workOlid);
        const editions = await works.getEditions(work!.id);
        expect(editions).toHaveLength(1);
        expect(editions[0]?.isbn13).toBe(isbn13);
        expect(editions[0]?.pageCount).toBe(160); // filled in by the duplicate
        expect(editions[0]?.externalIds).toEqual(expect.arrayContaining([
            { source: 'openlibrary', id: editionOlid },
            { source: 'openlibrary', id: duplicateOlid },
            { source: 'goodreads', id: `9${suffix}` },
        ]));
    });

    test("searchCatalog finds the work by title and by author, with its details", async () => {
        const [byTitle] = await searchCatalog(word.slice(0, -2), 20); // prefix match
        expect(byTitle).toMatchObject({
            title: `Plotline ${word}`,
            olid: workOlid,
            authors: [`Author ${word}`],
            coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
            source: 'catalog',
        });

        const byAuthor = await searchCatalog(`author ${word}`, 20);
        expect(byAuthor.map(r => r.olid)).toContain(workOlid);
    });

    test("import runs record their outcome", async () => {
        const run = await imports.startImportRun('openlibrary');
        await imports.finishImportRun(run, { works: { created: 1 } }, new Error('boom'));
        const [row] = await pg`SELECT status, error, stats FROM import_runs WHERE id = ${run}`;
        expect(row.status).toBe('failed');
        expect(row.error).toBe('boom');
        await pg`DELETE FROM import_runs WHERE id = ${run}`;
    });

    test("an error with an empty message still marks the run failed", async () => {
        const run = await imports.startImportRun('openlibrary');
        await imports.finishImportRun(run, {}, new Error(''));
        const [row] = await pg`SELECT status, error FROM import_runs WHERE id = ${run}`;
        expect(row.status).toBe('failed');
        expect(row.error).toBe('Unknown error');
        await pg`DELETE FROM import_runs WHERE id = ${run}`;
    });
});
