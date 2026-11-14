// Imports the OpenLibrary monthly dumps into the catalog (see docs/imports.md).
//
//   bun run import:openlibrary --download     # fetch the dumps if missing, then import
//   bun run import:openlibrary --limit 200000 # sample: only the first 200k edition lines
//   bun run import:openlibrary --dir D:/dumps # read dumps from another folder
//
// Only editions with a valid ISBN in OPENLIBRARY_LANGUAGES are kept, plus their works and
// authors. Five streaming passes, because each step needs IDs the previous one wrote:
//   1. editions  pick the editions to keep and remember them and their works
//   2. works     write those works, remember their authors
//   3. authors   write those authors
//   4. works     link works to authors
//   5. editions  write the editions picked in pass 1
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
    IMPORT_BATCH_SIZE, IMPORT_DATA_DIR, IMPORT_PROGRESS_EVERY,
    OPENLIBRARY_DUMPS, OPENLIBRARY_INCLUDE_NO_LANGUAGE, OPENLIBRARY_LANGUAGES,
} from '../../config/imports.ts';
import { userAgent } from '../../config/openlibrary.ts';
import { mysql } from '../../db/bindings/mysql.ts';
import * as repo from '../../db/imports/repo.ts';
import { batched, downloadIfMissing, IdSet, readLines } from '../dump.ts';
import {
    mightBeWantedEdition, olNumber, parseAuthor, parseDumpLine, parseEdition, parseWork,
    type EditionFilter,
} from './parse.ts';

const { values: args } = parseArgs({
    options: {
        dir: { type: 'string', default: IMPORT_DATA_DIR },
        download: { type: 'boolean', default: false },
        limit: { type: 'string' },
    },
});
const limit = args.limit ? Number(args.limit) : Infinity;
if (Number.isNaN(limit) || limit <= 0) throw new Error(`--limit must be a positive number, got ${args.limit}`);

type DumpName = keyof typeof OPENLIBRARY_DUMPS;
const dumpPath = (name: DumpName) => join(args.dir!, OPENLIBRARY_DUMPS[name].file);
const filter: EditionFilter = { languages: OPENLIBRARY_LANGUAGES, includeNoLanguage: OPENLIBRARY_INCLUDE_NO_LANGUAGE };
const stats: Record<string, Record<string, number>> = {};

// Parsed records of one type from a dump. `wanted` checks the key before the JSON is
// copied out of the line, so skipped records cost almost nothing. Logs progress.
async function* records<T>(
    step: string,
    dump: DumpName,
    parse: (json: string) => T | null,
    wanted: (key: string) => boolean = () => true,
    maxLines = Infinity,
): AsyncGenerator<T> {
    const type = `/type/${dump.slice(0, -1)}`; // editions -> /type/edition
    let lines = 0;
    let kept = 0;
    const started = Date.now();
    for await (const line of readLines(dumpPath(dump))) {
        if (++lines > maxLines) break;
        if (lines % IMPORT_PROGRESS_EVERY === 0) {
            console.log(`  ${step}: ${lines.toLocaleString()} lines, ${kept.toLocaleString()} kept (${Math.round((Date.now() - started) / 1000)}s)`);
        }
        const fields = parseDumpLine(line);
        if (!fields || fields.type !== type || !wanted(fields.key)) continue;
        const record = parse(fields.json());
        if (record != null) {
            kept++;
            yield record;
        }
    }
    console.log(`  ${step}: done, ${lines.toLocaleString()} lines, ${kept.toLocaleString()} kept`);
}

// Is this key's OL number in the set?
const inSet = (set: IdSet, suffix: 'W' | 'A' | 'M') => (key: string) => {
    const n = olNumber(key, suffix);
    return n != null && set.has(n);
};

const wantedEdition = (json: string) => (mightBeWantedEdition(json, filter) ? parseEdition(json, filter) : null);

async function writeBatches<T>(step: string, items: AsyncIterable<T>, write: (batch: T[]) => Promise<repo.BatchResult>) {
    const totals = { created: 0, updated: 0, skipped: 0 };
    for await (const batch of batched(items, IMPORT_BATCH_SIZE)) {
        const result = await write(batch);
        totals.created += result.created;
        totals.updated += result.updated;
        totals.skipped += result.skipped;
    }
    stats[step] = totals;
    console.log(`  ${step}: ${JSON.stringify(totals)}`);
}

async function main() {
    for (const name of Object.keys(OPENLIBRARY_DUMPS) as DumpName[]) {
        if (args.download) await downloadIfMissing(OPENLIBRARY_DUMPS[name].url, dumpPath(name), userAgent);
        if (!(await Bun.file(dumpPath(name)).exists())) throw new Error(`Missing ${dumpPath(name)}. Run with --download, or pass --dir.`);
    }

    const run = await repo.startImportRun('openlibrary');
    try {
        console.log('1/5 Choosing editions');
        const editions = new IdSet();
        const works = new IdSet();
        for await (const edition of records('editions', 'editions', wantedEdition, undefined, limit)) {
            editions.add(olNumber(edition.externalId, 'M')!);
            works.add(olNumber(edition.workExternalId, 'W')!);
        }
        stats.scan = { editions: editions.size, works: works.size };

        console.log(`2/5 Writing ${works.size.toLocaleString()} works`);
        const authors = new IdSet();
        await writeBatches('works', records('works', 'works', json => {
            const parsed = parseWork(json);
            if (!parsed) return null;
            for (const a of parsed.contributors.contributorExternalIds) authors.add(olNumber(a, 'A')!);
            return parsed.work;
        }, inSet(works, 'W')), batch => repo.importWorks('openlibrary', batch));

        console.log(`3/5 Writing ${authors.size.toLocaleString()} authors`);
        await writeBatches('authors', records('authors', 'authors', parseAuthor, inSet(authors, 'A')),
            batch => repo.importContributors('openlibrary', batch));

        console.log('4/5 Linking works to authors');
        await writeBatches('workAuthors', records('works', 'works', json => parseWork(json)?.contributors ?? null, inSet(works, 'W')),
            batch => repo.importWorkContributors('openlibrary', batch));

        console.log(`5/5 Writing ${editions.size.toLocaleString()} editions`);
        await writeBatches('editions', records('editions', 'editions', json => parseEdition(json, filter), inSet(editions, 'M'), limit),
            batch => repo.importEditions('openlibrary', batch));

        await repo.finishImportRun(run, stats);
        console.log('Import finished.', JSON.stringify(stats));
    } catch (error) {
        await repo.finishImportRun(run, stats, error);
        throw error;
    }
}

try {
    await main();
} finally {
    await mysql.close();
}
