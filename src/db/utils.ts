import type { DateString, UUID } from "./types.ts";

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

export function uuidToBinary(uuid: string | UUID): Buffer {
    const hex = (uuid as string).replace(/-/g, "");
    if (hex.length !== 32) throw new Error(`Invalid UUID string: ${uuid}`);
    return Buffer.from(hex, "hex");
}