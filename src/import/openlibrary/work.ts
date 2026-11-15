// Imports one work on demand from the OpenLibrary API: for works the dump import didn't
// include, the first time someone opens them. The API returns the same JSON as the dumps,
// so this uses the dump parsers and the imports repo, and writes the catalog exactly as the
// monthly import would. That import later updates these rows like any other.
import { OPENLIBRARY_INCLUDE_NO_LANGUAGE, OPENLIBRARY_LANGUAGES } from '../../config/imports.ts';
import { getContributorByExternalId } from '../../db/contributors/repo.ts';
import { importContributors, importEditions, importWorkContributors, importWorks } from '../../db/imports/repo.ts';
import { isUniqueViolation } from '../../db/utils.ts';
import { addWorkAlias, getWorkByExternalId, refreshEditionCount } from '../../db/works/repo.ts';
import type { ImportContributor, ImportEdition } from '../../schemas/imports.ts';
import { WorkOlidSchema } from '../../schemas/openlibrary.ts';
import { getAuthor, getEditions, getWork } from '../../services/openlibrary/client.ts';
import { olId } from '../../services/openlibrary/utils.ts';
import { HttpError } from '../../utils/api.ts';
import { parseAuthorRecord, parseEditionRecord, parseWorkRecord, type ParsedWork } from './parse.ts';

const MAX_REDIRECTS = 3;
const EDITION_FILTER = { languages: OPENLIBRARY_LANGUAGES, includeNoLanguage: OPENLIBRARY_INCLUDE_NO_LANGUAGE };

// OpenLibrary merges duplicate works and leaves the old ID as a redirect record. Follows those
// to the surviving work. Null if the work doesn't exist, was deleted or has no title.
export async function fetchWork(olid: string): Promise<(ParsedWork & { redirectedFrom: string[] }) | null> {
    const redirectedFrom: string[] = [];
    let id = olid;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const record = await getWork(id);
        const type = record?.type?.key;
        if (!record || type === '/type/delete') return null;
        if (type === '/type/redirect') {
            const next = typeof record.location === 'string' ? olId(record.location) : '';
            if (!WorkOlidSchema.safeParse(next).success || next === id) return null;
            redirectedFrom.push(id);
            id = next;
            continue;
        }
        const parsed = parseWorkRecord(record);
        return parsed && { ...parsed, redirectedFrom };
    }
    return null;
}

// Authors OpenLibrary has, skipping any it has since deleted.
export async function fetchAuthors(olids: string[]): Promise<ImportContributor[]> {
    const records = await Promise.all(olids.map(getAuthor));
    return records.flatMap(record => parseAuthorRecord(record) ?? []);
}

// Up to 100 editions, filtered as the dump import filters them (ISBN and language).
export async function fetchEditions(workOlid: string): Promise<ImportEdition[]> {
    const payload = await getEditions(workOlid);
    const entries: unknown[] = Array.isArray(payload?.entries) ? payload.entries : [];
    return entries.flatMap(entry => {
        const edition = parseEditionRecord(entry, EDITION_FILTER);
        return edition && edition.workExternalId === workOlid ? [edition] : [];
    });
}

// Returns our work ID, or null if OpenLibrary has no such work.
export async function importOpenLibraryWork(olid: string): Promise<string | null> {
    if (!WorkOlidSchema.safeParse(olid).success) throw new HttpError(400, `Invalid work ID: ${olid}`);

    const fetched = await fetchWork(olid);
    if (!fetched) return null;
    const { work, contributors, redirectedFrom } = fetched;

    // The ID we were given may redirect to a work the catalog already has.
    let workId = (await getWorkByExternalId('openlibrary', work.externalId))?.id;
    if (!workId) {
        const known = await Promise.all(contributors.contributorExternalIds.map(id => getContributorByExternalId('openlibrary', id)));
        const missing = contributors.contributorExternalIds.filter((_, i) => !known[i]);
        const [authors, editions] = await Promise.all([fetchAuthors(missing), fetchEditions(work.externalId)]);

        const save = async () => {
            await importContributors('openlibrary', authors);
            await importWorks('openlibrary', [work]);
            await importWorkContributors('openlibrary', [contributors]);
            await importEditions('openlibrary', editions);
        };
        // Each step upserts by external ID, so when a concurrent request created the same rows
        // first, running it again links to what that request wrote.
        try {
            await save();
        } catch (error) {
            if (!isUniqueViolation(error)) throw error;
            await save();
        }
        workId = (await getWorkByExternalId('openlibrary', work.externalId))!.id;
        await refreshEditionCount(workId);
    }

    for (const alias of redirectedFrom) await addWorkAlias(workId, 'openlibrary', alias);
    return workId;
}
