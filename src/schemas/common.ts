import { z } from 'zod';

export const UUIDSchema = z.uuid();
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date should be 'YYYY-MM-DD' format");
export const DateTimeSchema = z.iso.datetime();

export type Date = z.infer<typeof DateSchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type UUID = z.infer<typeof UUIDSchema>;