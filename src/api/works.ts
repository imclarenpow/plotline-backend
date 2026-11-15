import { getEditions, getWorkByExternalId, getWorkDetail, workExists } from '../db/works/repo.ts';
import { importOpenLibraryWork } from '../import/openlibrary/work.ts';
import { UUIDSchema } from '../schemas/common.ts';
import { SourceNameSchema, type SourceName } from '../schemas/sources.ts';
import { HttpError, jsonResponse } from '../utils/api.ts';

// Works are addressed by our own ID. A source's ID only gets you to one through
// /api/works/resolve, so clients never depend on any one source's IDs.

// Sources that can fetch a work the catalog doesn't have yet. Each returns our work ID,
// or null if the source has no such work.
const importers: Partial<Record<SourceName, (externalId: string) => Promise<string | null>>> = {
    openlibrary: importOpenLibraryWork,
};

function validWorkId(id: string): string {
    if (!UUIDSchema.safeParse(id).success) throw new HttpError(400, `Invalid work ID: ${id}`);
    return id;
}

async function detailOrNotFound(workId: string) {
    const work = await getWorkDetail(workId);
    if (!work) throw new HttpError(404, `Work not found: ${workId}`);
    return jsonResponse(work);
}

// Catalog only: never calls a source.
export async function workHandler(id: string) {
    return detailOrNotFound(validWorkId(id));
}

export async function workEditionsHandler(id: string) {
    const workId = validWorkId(id);
    if (!(await workExists(workId))) throw new HttpError(404, `Work not found: ${workId}`);
    return jsonResponse({ workId, editions: await getEditions(workId) });
}

// Finds the work a source's ID belongs to. If the catalog doesn't have it and the source can
// supply it, imports it first, so the next request is a plain catalog lookup.
export async function resolveWorkHandler(source: string, externalId: string) {
    const parsed = SourceNameSchema.safeParse(source);
    if (!parsed.success) throw new HttpError(400, `Unknown source: ${source}`);

    const found = await getWorkByExternalId(parsed.data, externalId);
    if (found) return detailOrNotFound(found.id);

    const workId = await importers[parsed.data]?.(externalId);
    if (!workId) throw new HttpError(404, `No work with ${source} ID ${externalId}`);
    console.log(`/api/works/resolve/${source}/${externalId} - imported as ${workId}`);
    return detailOrNotFound(workId);
}
