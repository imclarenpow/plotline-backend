import type { DateString, ExternalId, SourceName, UUID } from "./types.ts";

export function assertDateString(date: string): DateString {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) throw new Error(`Invalid DateString format: ${date}`);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (month < 1 || month > 12) throw new Error(`Invalid month in DateString: ${date}`);
    if (day < 1 || day > 31) throw new Error(`Invalid day in DateString: ${date}`);

    if ([4, 6, 9, 11].includes(month) && day > 30) {
        throw new Error(`Invalid day for month in DateString: ${date}`);
    }
    if (month === 2 && day > 29) {
        throw new Error(`Invalid day for February in DateString: ${date}`);
    }

    return date as DateString;
}

export function binaryToUuid(bin: Buffer | Uint8Array): UUID {
    if (!(bin instanceof Uint8Array || Buffer.isBuffer(bin))) {
        throw new Error("Expected binary UUID");
    }

    const hex = Array.from(bin)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    const uuid = `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
    return uuid as UUID;
}

// MySQL DATE columns come back as JS Dates at local midnight; convert them to "YYYY-MM-DD".
// Uses local date parts: toISOString() would shift the day in timezones ahead of UTC (e.g. NZ).
export function toDateString(value: Date | string | null | undefined): DateString | null {
    if (value == null) return null;
    if (typeof value === "string") return assertDateString(value.slice(0, 10));
    const pad = (n: number) => String(n).padStart(2, "0");
    return assertDateString(`${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`);
}

// Turns `SELECT s.name AS source, x.external_id AS id` rows into plain ExternalId objects
// (query results are arrays carrying extra metadata such as `count` and `command`).
export function toExternalIds(rows: Iterable<{ source: string; id: string }>): ExternalId[] {
    return Array.from(rows, row => ({ source: row.source as SourceName, id: row.id }));
}

// Time-ordered (v7) UUIDs keep BINARY(16) primary keys roughly sequential, which suits InnoDB indexes.
export function newUuid(): UUID {
    return Bun.randomUUIDv7() as UUID;
}

export function uuidToBinary(uuid: string | UUID): Buffer {
    const hex = (uuid as string).replace(/-/g, "");
    if (hex.length !== 32) throw new Error(`Invalid UUID string: ${uuid}`);
    return Buffer.from(hex, "hex");
}