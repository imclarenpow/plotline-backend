import { afterAll, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { batched, IdSet, readLines } from './dump.ts';

const dir = join(tmpdir(), `plotline-dump-test-${Date.now()}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
    const out: T[] = [];
    for await (const item of items) out.push(item);
    return out;
}

describe("readLines", () => {
    test("reads plain and gzipped files line by line", async () => {
        const text = 'one\ntwo\r\nthree';
        await Bun.write(join(dir, 'lines.txt'), text);
        await Bun.write(join(dir, 'lines.txt.gz'), gzipSync(text));
        expect(await collect(readLines(join(dir, 'lines.txt')))).toEqual(['one', 'two', 'three']);
        expect(await collect(readLines(join(dir, 'lines.txt.gz')))).toEqual(['one', 'two', 'three']);
    });
});

describe("batched", () => {
    test("groups items and yields the remainder last", async () => {
        async function* numbers() { for (let i = 1; i <= 5; i++) yield i; }
        expect(await collect(batched(numbers(), 2))).toEqual([[1, 2], [3, 4], [5]]);
    });
});

describe("IdSet", () => {
    test("tracks membership and size, growing past its initial capacity", async () => {
        const ids = new IdSet();
        ids.add(7);
        ids.add(7);
        ids.add(45_000_000);
        expect(ids.size).toBe(2);
        expect(ids.has(7)).toBe(true);
        expect(ids.has(8)).toBe(false);
        expect(ids.has(45_000_000)).toBe(true);
        expect(ids.has(90_000_000)).toBe(false);
    });
});
