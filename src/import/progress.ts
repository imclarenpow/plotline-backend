// Progress display for long-running import steps (downloads). Formatting is pure and tested;
// ProgressBar only decides when and how to print.

export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '--';
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(sec).padStart(2, '0')}s` : `${sec}s`;
}

const BAR_WIDTH = 24;

// One status line, e.g.
//   [#########---------------]  38.2%  4.1 GB / 10.8 GB  12.3 MB/s  ETA 9m 05s
// Without a known total (no Content-Length), shows only bytes and speed.
export function formatProgress(received: number, total: number | null, bytesPerSecond: number): string {
    const speed = `${formatBytes(bytesPerSecond)}/s`;
    if (!total) return `${formatBytes(received)}  ${speed}`;
    const fraction = Math.min(received / total, 1);
    const filled = Math.round(fraction * BAR_WIDTH);
    const bar = `[${'#'.repeat(filled)}${'-'.repeat(BAR_WIDTH - filled)}]`;
    const eta = bytesPerSecond > 0 ? formatDuration((total - received) / bytesPerSecond) : '--';
    return `${bar} ${(fraction * 100).toFixed(1).padStart(5)}%  ${formatBytes(received)} / ${formatBytes(total)}  ${speed}  ETA ${eta}`;
}

// Redraws one line in place on a terminal; elsewhere (logs, CI) prints a line every
// LOG_EVERY_MS so output stays readable. Speed is averaged over a short window so it
// reacts to changes without jumping around on every chunk.
const REDRAW_EVERY_MS = 250;
const LOG_EVERY_MS = 10_000;
const SPEED_WINDOW_MS = 5_000;

export class ProgressBar {
    private received = 0;
    private readonly started = Date.now();
    private lastPrint = Date.now(); // first redraw after one interval, once speed is meaningful
    private samples: { at: number; bytes: number }[] = [{ at: Date.now(), bytes: 0 }];
    private readonly tty = Boolean(process.stdout.isTTY);

    constructor(private readonly total: number | null) {}

    add(bytes: number): void {
        this.received += bytes;
        const now = Date.now();
        if (now - this.lastPrint < (this.tty ? REDRAW_EVERY_MS : LOG_EVERY_MS)) return;
        this.lastPrint = now;
        this.samples.push({ at: now, bytes: this.received });
        while (this.samples.length > 2 && now - this.samples[0]!.at > SPEED_WINDOW_MS) this.samples.shift();
        this.print(this.speed(now));
    }

    // Final line with the average speed over the whole download.
    done(): void {
        const seconds = (Date.now() - this.started) / 1000;
        const average = seconds > 0 ? this.received / seconds : 0;
        this.print(average);
        if (this.tty) process.stdout.write('\n');
        console.log(`  ${formatBytes(this.received)} in ${formatDuration(seconds)}`);
    }

    private speed(now: number): number {
        const first = this.samples[0]!;
        const seconds = (now - first.at) / 1000;
        return seconds > 0 ? (this.received - first.bytes) / seconds : 0;
    }

    private print(bytesPerSecond: number): void {
        const line = `  ${formatProgress(this.received, this.total, bytesPerSecond)}`;
        if (this.tty) process.stdout.write(`\r${line}\x1b[K`);
        else console.log(line);
    }
}
