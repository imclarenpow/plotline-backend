import { describe, expect, test } from 'bun:test';
import { formatBytes, formatDuration, formatProgress } from './progress.ts';

describe("formatBytes", () => {
    test("picks a readable unit", async () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1536)).toBe('1.5 KB');
        expect(formatBytes(12.3 * 1024 ** 2)).toBe('12.3 MB');
        expect(formatBytes(10.8 * 1024 ** 3)).toBe('10.8 GB');
    });
});

describe("formatDuration", () => {
    test("shows the two largest units", async () => {
        expect(formatDuration(42)).toBe('42s');
        expect(formatDuration(545)).toBe('9m 05s');
        expect(formatDuration(3 * 3600 + 7 * 60)).toBe('3h 07m');
    });

    test("shows -- when unknown", async () => {
        expect(formatDuration(Infinity)).toBe('--');
        expect(formatDuration(NaN)).toBe('--');
    });
});

describe("formatProgress", () => {
    const GB = 1024 ** 3;
    const MB = 1024 ** 2;

    test("shows bar, percent, sizes, speed and time left", async () => {
        expect(formatProgress(2.7 * GB, 10.8 * GB, 10 * MB))
            .toBe('[######------------------]  25.0%  2.7 GB / 10.8 GB  10.0 MB/s  ETA 13m 49s');
    });

    test("is full and capped at 100% when done", async () => {
        expect(formatProgress(11 * GB, 10 * GB, MB)).toStartWith(`[${'#'.repeat(24)}] 100.0%`);
    });

    test("shows only size and speed without a known total", async () => {
        expect(formatProgress(5 * MB, null, MB)).toBe('5.0 MB  1.0 MB/s');
    });

    test("shows no ETA before any speed is known", async () => {
        expect(formatProgress(0, GB, 0)).toEndWith('ETA --');
    });
});
