// Finding, downloading and cleaning up OpenLibrary dump files.
//
// Dumps are saved under their dated names (ol_dump_works_2026-10-31.txt.gz), which the
// *_latest URLs redirect to. The date says which month's data a file holds, so a download
// only happens when OpenLibrary has published a newer dump, and an import can tell whether
// that dump was already imported.
import { existsSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { OPENLIBRARY_DUMPS } from '../../config/imports.ts';
import { downloadIfMissing } from '../dump.ts';

export type DumpName = keyof typeof OPENLIBRARY_DUMPS;
export const DUMP_NAMES = Object.keys(OPENLIBRARY_DUMPS) as DumpName[];

const DATED = /^ol_dump_([a-z]+)_(\d{4}-\d{2}-\d{2})\.txt\.gz$/;

// The dump date in a dated file name, or null (e.g. for an old *_latest file).
export function dumpDate(fileName: string): string | null {
    return DATED.exec(basename(fileName))?.[2] ?? null;
}

function legacyFileName(name: DumpName): string {
    return `ol_dump_${name}_latest.txt.gz`;
}

// The newest dump of this kind in `dir`: the latest dated file, or an undated *_latest file
// saved before dumps were stored by date. Null when there is neither.
export function findLocalDump(dir: string, name: DumpName): string | null {
    if (!existsSync(dir)) return null;
    const dated = readdirSync(dir)
        .filter(f => DATED.exec(f)?.[1] === name)
        .sort(); // ISO dates sort correctly as text
    if (dated.length) return join(dir, dated.at(-1)!);
    const legacy = join(dir, legacyFileName(name));
    return existsSync(legacy) ? legacy : null;
}

// Dumps of this kind other than `keep`: older dated files and *_latest files.
export function otherDumps(dir: string, name: DumpName, keep: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter(f => DATED.exec(f)?.[1] === name || f === legacyFileName(name))
        .map(f => join(dir, f))
        .filter(path => basename(path) !== basename(keep));
}

// Asks where the *_latest URL redirects (a HEAD request, no download) to learn the newest
// dump's dated file name and size.
async function latestRemoteDump(name: DumpName, headers: Record<string, string>) {
    const res = await fetch(OPENLIBRARY_DUMPS[name].url, { method: 'HEAD', redirect: 'follow', headers });
    if (!res.ok) throw new Error(`Couldn't check the latest ${name} dump (${res.status})`);
    const fileName = basename(new URL(res.url).pathname);
    if (!dumpDate(fileName)) throw new Error(`Unexpected dump file name for ${name}: ${fileName}`);
    const size = Number(res.headers.get('content-length'));
    return { url: res.url, fileName, size: Number.isFinite(size) && size > 0 ? size : null };
}

// Makes sure the newest published dump of this kind is in `dir`, downloading only if it
// isn't. An undated *_latest file of exactly the same size is the same dump saved under the
// old naming, so it's renamed instead of downloaded again. Returns the file's path.
export async function fetchLatestDump(dir: string, name: DumpName, headers: Record<string, string>): Promise<string> {
    const remote = await latestRemoteDump(name, headers);
    const path = join(dir, remote.fileName);
    const legacy = join(dir, legacyFileName(name));
    if (!existsSync(path) && remote.size && existsSync(legacy) && statSync(legacy).size === remote.size) {
        renameSync(legacy, path);
        console.log(`Renamed ${legacy} to ${remote.fileName} (same dump)`);
    }
    await downloadIfMissing(remote.url, path, headers);
    return path;
}

export function deleteDumps(paths: string[]): void {
    for (const path of paths) {
        unlinkSync(path);
        console.log(`Deleted ${path}`);
    }
}
