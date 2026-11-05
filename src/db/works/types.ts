import type { Work } from "../../schemas/works.ts";
import type { SourceName } from "../types.ts";

export type { Work, NewWork, Edition, NewEdition } from "../../schemas/works.ts";

// A work as listed under a contributor, with the role they had on it.
export type ContributedWork = Work & { role: string };

// What one source said about a work, as stored in work_signals.
export type WorkSignals = {
    source: SourceName;
    signals: Record<string, unknown>;
    fetchedAt: Date;
};
