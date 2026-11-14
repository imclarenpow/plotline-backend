export type { SourceName, ExternalId } from "../schemas/sources.ts";

// types requiring regex validation
export type DateString = string & { __brand: "DateString" };
export type UUID = string & { __brand: "UUID" };
