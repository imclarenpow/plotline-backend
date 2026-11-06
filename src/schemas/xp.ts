import { z } from 'zod';

// A subject already matched against the `subjects` table, with its category weight.
export const XpSubjectSchema = z.object({
    name: z.string(),
    value: z.number().min(1).max(10),
    category: z.string(),
    weight: z.number().min(0)
});

export const CommunityRatingSchema = z.object({
    average: z.number().min(1).max(5),
    count: z.number().int().min(0)
});

// Everything calculateXp needs, already resolved from sources and lookup tables.
export const XpInputSchema = z.object({
    pageCount: z.number().int().min(1).nullish(),
    formatDensity: z.number().positive().nullish(),
    subjects: z.array(XpSubjectSchema).default([]),
    communityRating: CommunityRatingSchema.nullish()
});

export type XpSubject = z.infer<typeof XpSubjectSchema>;
export type CommunityRating = z.infer<typeof CommunityRatingSchema>;
export type XpInput = z.input<typeof XpInputSchema>;

export type XpBreakdown = {
    pageCount: number | null;
    lengthScore: number | null;
    formatDensity: number;
    juvenile: boolean;              // audience level <= JUVENILE_MAX_AUDIENCE_LEVEL
    density: number;                // formatDensity, halved for juvenile books
    subjectDifficulty: number;      // 1-10, after the audience rule
    communityDifficulty: number | null; // 1-10, null without ratings
    difficulty: number;             // 1-10, final blend
    difficultyMultiplier: number;
};

export type XpResult = {
    xp: number | null; // null when the page count is unknown
    xpVersion: number;
    breakdown: XpBreakdown;
};
