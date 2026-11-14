// Source-independent helpers for streaming large dump files.
import { createReadStream, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { ProgressBar } from './progress.ts';

// Streams a (optionally gzipped) text file line by line, without loading it into memory.
export async function* readLines(path: string): AsyncGenerator<string> {
    const file = createReadStream(path);
    const input = path.endsWith('.gz') ? file.pipe(createGunzip()) : file;
    const lines = createInterface({ input, crlfDelay: Infinity });
    try {
        for await (const line of lines) yield line;
    } finally {
        lines.close();
        file.destroy();
    }
}

// Groups items into arrays of `size`; the last batch may be smaller.
export async function* batched<T>(items: AsyncIterable<T>, size: number): AsyncGenerator<T[]> {
    let batch: T[] = [];
    for await (const item of items) {
        batch.push(item);
        if (batch.length >= size) {
            yield batch;
            batch = [];
        }
    }
    if (batch.length) yield batch;
}

// A set of non-negative integers stored as a bitmap: tens of millions of IDs fit in a
// few MB, where a Set<string> of the same keys would need gigabytes.
export class IdSet {
    private bits = new Uint8Array(1 << 20);
    size = 0;

    add(id: number): void {
        const byte = id >>> 3;
        if (byte >= this.bits.length) {
            const grown = new Uint8Array(Math.max(byte + 1, this.bits.length * 2));
            grown.set(this.bits);
            this.bits = grown;
        }
        const mask = 1 << (id & 7);
        if (!(this.bits[byte]! & mask)) {
            this.bits[byte]! |= mask;
            this.size++;
        }
    }

    has(id: number): boolean {
        const byte = id >>> 3;
        return byte < this.bits.length && (this.bits[byte]! & (1 << (id & 7))) !== 0;
    }
}

// Downloads `url` to `path` unless the file is already there. Streams to disk chunk by
// chunk with a progress bar, into `.part` first so an interrupted download is never
// mistaken for a finished one.
export async function downloadIfMissing(url: string, path: string, headers: Record<string, string>): Promise<void> {
    if (existsSync(path)) {
        console.log(`Using existing ${path}`);
        return;
    }
    mkdirSync(dirname(path), { recursive: true });
    console.log(`Downloading ${url}`);
    const res = await fetch(url, { headers, redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);

    const length = Number(res.headers.get('content-length'));
    const progress = new ProgressBar(Number.isFinite(length) && length > 0 ? length : null);
    const partial = `${path}.part`;
    const file = Bun.file(partial).writer();
    try {
        for await (const chunk of res.body) {
            file.write(chunk);
            progress.add(chunk.byteLength);
        }
    } finally {
        await file.end();
    }
    progress.done();
    renameSync(partial, path);
    console.log(`Saved ${path}`);
}
