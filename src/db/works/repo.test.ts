import { afterAll, expect, test } from 'bun:test';
import { describeDb } from '../testing.ts';
import { mysql } from '../bindings/mysql.ts';
import * as works from './repo.ts';
import * as contributors from '../contributors/repo.ts';
import { SourceNameSchema } from '../../schemas/sources.ts';

// Integration tests against the live dev database. Every record uses a unique suffix
// and is deleted afterwards, so the tests can run against seeded data.
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const workOlid = `OL${suffix}W`;
const createdWorks: string[] = [];
const createdContributors: string[] = [];

afterAll(async () => {
    for (const id of createdWorks) await works.deleteWork(id);
    for (const id of createdContributors) await contributors.deleteContributor(id);
});

describeDb("seeded lookup tables", () => {
    test("formats, sources, roles and subjects are populated", async () => {
        const [counts] = await mysql`
            SELECT (SELECT COUNT(*) FROM formats) AS formats,
                   (SELECT COUNT(*) FROM sources) AS sources,
                   (SELECT COUNT(*) FROM contributor_roles) AS roles,
                   (SELECT COUNT(*) FROM subjects) AS subjects;
        `;
        expect(Number(counts.formats)).toBeGreaterThanOrEqual(4);
        expect(Number(counts.sources)).toBeGreaterThanOrEqual(5);
        expect(Number(counts.roles)).toBeGreaterThanOrEqual(1);
        expect(Number(counts.subjects)).toBeGreaterThan(900);
    });

    test("SourceNameSchema matches the rows in the sources table", async () => {
        const rows = await mysql`SELECT name FROM sources ORDER BY name`;
        const inDb = rows.map((r: { name: string }) => r.name);
        expect([...SourceNameSchema.options].sort()).toEqual(inDb);
    });

    test("dummy data is reachable by OpenLibrary ID", async () => {
        const work = await works.getWorkByExternalId('openlibrary', 'OL8483260W');
        expect(work?.title).toBe('Diary of a Wimpy Kid');
        expect(work?.format).toBe('prose');
    });
});

describeDb("works repo", () => {
    let workId: string;

    test("createWork stores the work, its format and external IDs", async () => {
        const work = await works.createWork({
            title: 'Saga, Volume One',
            format: 'comic',
            firstPublishedYear: 2012,
            pageCount: 160,
            externalIds: [
                { source: 'openlibrary', id: workOlid },
                { source: 'wikidata', id: `Q${suffix}` },
            ],
        });
        workId = work.id;
        createdWorks.push(work.id);

        expect(work.title).toBe('Saga, Volume One');
        expect(work.format).toBe('comic');
        expect(work.pageCount).toBe(160);
        expect(work.xp).toBeNull();
        // ordered by source priority: wikidata (50) before openlibrary (40)
        expect(work.externalIds).toEqual([
            { source: 'wikidata', id: `Q${suffix}` },
            { source: 'openlibrary', id: workOlid },
        ]);
    });

    test("getWorkByExternalId finds the same work", async () => {
        const work = await works.getWorkByExternalId('openlibrary', workOlid);
        expect(work?.id).toBe(workId);
    });

    test("getWork returns null for an unknown id", async () => {
        expect(await works.getWork(Bun.randomUUIDv7())).toBeNull();
    });

    test("an external ID cannot be attached to two works", async () => {
        await expect(works.createWork({
            title: 'Duplicate',
            externalIds: [{ source: 'openlibrary', id: workOlid }],
        })).rejects.toThrow();
        // the transaction rolled back, so no orphan 'Duplicate' work was left behind
        const [row] = await mysql`SELECT COUNT(*) AS n FROM works WHERE title = 'Duplicate'`;
        expect(Number(row.n)).toBe(0);
    });

    test("addEdition and getEditions round-trip ISBNs and edition IDs", async () => {
        await works.addEdition(workId, {
            isbn13: `978${suffix}`.slice(0, 13).padEnd(13, '0'),
            pageCount: 168,
            publishedYear: 2012,
            language: 'eng',
            externalIds: [{ source: 'openlibrary', id: `OL${suffix}M` }],
        });
        const editions = await works.getEditions(workId);
        expect(editions).toHaveLength(1);
        expect(editions[0]?.pageCount).toBe(168);
        expect(editions[0]?.workId).toBe(workId);
        expect(editions[0]?.externalIds).toEqual([{ source: 'openlibrary', id: `OL${suffix}M` }]);
    });

    test("setWorkSignals upserts one row per source", async () => {
        await works.setWorkSignals(workId, 'google_books', { pageCount: 150 });
        await works.setWorkSignals(workId, 'google_books', { pageCount: 160, categories: ['Comics & Graphic Novels'] });
        await works.setWorkSignals(workId, 'gcd', { format: 'comic' });

        const signals = await works.getWorkSignals(workId);
        expect(signals.map(s => s.source)).toEqual(['gcd', 'google_books']);
        expect(signals[1]?.signals).toEqual({ pageCount: 160, categories: ['Comics & Graphic Novels'] });
    });

    test("setWorkXp records the score and formula version", async () => {
        await works.setWorkXp(workId, 420, 1);
        const work = await works.getWork(workId);
        expect(work?.xp).toBe(420);
        expect(work?.xpVersion).toBe(1);
    });
});

describeDb("contributors repo", () => {
    test("contributors link to works with a role", async () => {
        const writer = await contributors.createContributor({
            name: 'Brian K. Vaughan',
            birthDate: '1976-07-17',
            externalIds: [{ source: 'wikidata', id: `Q${suffix}1` }],
        });
        createdContributors.push(writer.id);
        expect(writer.birthDate).toBe('1976-07-17');
        expect((await contributors.getContributorByExternalId('wikidata', `Q${suffix}1`))?.id).toBe(writer.id);

        const work = await works.createWork({ title: 'Saga, Volume Two', format: 'comic' });
        createdWorks.push(work.id);
        await works.linkContributor(work.id, writer.id, 'writer');

        const written = await works.getWorksByContributor(writer.id);
        expect(written.map(w => [w.title, w.role])).toEqual([['Saga, Volume Two', 'writer']]);
    });

    test("an unknown role is rejected instead of silently dropped", async () => {
        const person = await contributors.createContributor({ name: 'Nobody' });
        createdContributors.push(person.id);
        const work = await works.createWork({ title: 'Untitled' });
        createdWorks.push(work.id);
        await expect(works.linkContributor(work.id, person.id, 'not-a-role')).rejects.toThrow();
    });

    test("deleting a work cascades to its external IDs", async () => {
        const work = await works.createWork({
            title: 'Short-lived',
            externalIds: [{ source: 'openlibrary', id: `OL${suffix}9W` }],
        });
        await works.deleteWork(work.id);
        expect(await works.getWorkByExternalId('openlibrary', `OL${suffix}9W`)).toBeNull();
        const [row] = await mysql`SELECT COUNT(*) AS n FROM work_external_ids WHERE external_id = ${`OL${suffix}9W`}`;
        expect(Number(row.n)).toBe(0);
    });
});
