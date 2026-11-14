import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dumpDate, fetchLatestDump, findLocalDump, otherDumps } from './dumps.ts';

const root = join(tmpdir(), `plotline-dumps-test-${Date.now()}`);
let dir: string;
let n = 0;
beforeEach(() => {
    dir = join(root, String(n++));
    mkdirSync(dir, { recursive: true });
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const touch = (name: string, content = 'x') => writeFileSync(join(dir, name), content);

describe("dumpDate", () => {
    test("reads the date from a dated file name, with or without a folder", async () => {
        expect(dumpDate('ol_dump_works_2026-10-31.txt.gz')).toBe('2026-10-31');
        expect(dumpDate('/data/ol_dump_editions_2026-11-30.txt.gz')).toBe('2026-11-30');
    });

    test("is null for undated *_latest files and other names", async () => {
        expect(dumpDate('ol_dump_works_latest.txt.gz')).toBeNull();
        expect(dumpDate('ol_dump_works_2026-10-31.txt.gz.part')).toBeNull();
    });
});

describe("findLocalDump", () => {
    test("picks the newest dated dump of the right kind", async () => {
        touch('ol_dump_works_2026-09-30.txt.gz');
        touch('ol_dump_works_2026-10-31.txt.gz');
        touch('ol_dump_editions_2026-12-31.txt.gz');
        touch('ol_dump_works_latest.txt.gz');
        expect(findLocalDump(dir, 'works')).toBe(join(dir, 'ol_dump_works_2026-10-31.txt.gz'));
    });

    test("falls back to an undated *_latest file, then to null", async () => {
        expect(findLocalDump(dir, 'authors')).toBeNull();
        touch('ol_dump_authors_latest.txt.gz');
        expect(findLocalDump(dir, 'authors')).toBe(join(dir, 'ol_dump_authors_latest.txt.gz'));
        expect(findLocalDump(join(dir, 'missing'), 'authors')).toBeNull();
    });
});

describe("otherDumps", () => {
    test("lists the other dumps of that kind, never the kept one or other kinds", async () => {
        touch('ol_dump_works_2026-09-30.txt.gz');
        touch('ol_dump_works_2026-10-31.txt.gz');
        touch('ol_dump_works_latest.txt.gz');
        touch('ol_dump_editions_2026-09-30.txt.gz');
        touch('import.log');
        const others = otherDumps(dir, 'works', join(dir, 'ol_dump_works_2026-10-31.txt.gz'));
        expect(others.sort()).toEqual([
            join(dir, 'ol_dump_works_2026-09-30.txt.gz'),
            join(dir, 'ol_dump_works_latest.txt.gz'),
        ]);
    });
});

describe("fetchLatestDump", () => {
    let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;
    const remoteUrl = 'https://archive.org/download/ol_dump_2026-10-31/ol_dump_works_2026-10-31.txt.gz';

    // A HEAD request that "redirected" to the dated file, and a download of `body`.
    const mockRemote = (body: string) => {
        fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (_url: string, init?: RequestInit) => {
            const res = new Response(init?.method === 'HEAD' ? null : body, {
                headers: { 'content-length': String(body.length) },
            });
            Object.defineProperty(res, 'url', { value: remoteUrl });
            return res;
        }) as any);
    };
    afterEach(() => fetchSpy?.mockRestore());

    test("downloads the newest dump under its dated name", async () => {
        mockRemote('new dump');
        const path = await fetchLatestDump(dir, 'works', {});
        expect(path).toBe(join(dir, 'ol_dump_works_2026-10-31.txt.gz'));
        expect(await Bun.file(path).text()).toBe('new dump');
    });

    test("does nothing when that dated dump is already there", async () => {
        touch('ol_dump_works_2026-10-31.txt.gz', 'already here');
        mockRemote('new dump');
        await fetchLatestDump(dir, 'works', {});
        expect(await Bun.file(join(dir, 'ol_dump_works_2026-10-31.txt.gz')).text()).toBe('already here');
        expect(fetchSpy).toHaveBeenCalledTimes(1); // the HEAD request only
    });

    test("renames a *_latest file of the same size instead of downloading it again", async () => {
        touch('ol_dump_works_latest.txt.gz', 'same dump'); // 9 bytes, like the remote one
        mockRemote('same dump');
        await fetchLatestDump(dir, 'works', {});
        expect(readdirSync(dir)).toEqual(['ol_dump_works_2026-10-31.txt.gz']);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("downloads when a *_latest file has a different size, keeping the old file", async () => {
        touch('ol_dump_works_latest.txt.gz', 'older');
        mockRemote('newer dump');
        await fetchLatestDump(dir, 'works', {});
        expect(existsSync(join(dir, 'ol_dump_works_latest.txt.gz'))).toBe(true);
        expect(await Bun.file(join(dir, 'ol_dump_works_2026-10-31.txt.gz')).text()).toBe('newer dump');
    });
});
