// Plotpoints (XP) for a book: xp = f(pages) × format density × difficulty multiplier.
// Pure functions only: callers resolve subjects, density and ratings first. See docs/xp.md.
import * as cfg from '../../config/xp.ts';
import type { CommunityRating, XpInput, XpResult, XpSubject } from '../../schemas/xp.ts';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const clampDifficulty = (d: number) => clamp(d, cfg.MIN_DIFFICULTY, cfg.MAX_DIFFICULTY);

// Weighted average of subject values. The weight decides how much a subject counts,
// without changing its 1-10 scale, so a low-weight subject can't drag the score down.
function weightedAverage(subjects: XpSubject[]): number | null {
    const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return null;
    return subjects.reduce((sum, s) => sum + s.value * s.weight, 0) / totalWeight;
}

// Average value of the audience subjects (1-10), or null when there are none.
export function audienceLevel(subjects: XpSubject[]): number | null {
    const audience = subjects.filter(s => s.category === cfg.AUDIENCE_CATEGORY);
    if (audience.length === 0) return null;
    return audience.reduce((sum, s) => sum + s.value, 0) / audience.length;
}

export function isJuvenile(subjects: XpSubject[]): boolean {
    const level = audienceLevel(subjects);
    return level !== null && level <= cfg.JUVENILE_MAX_AUDIENCE_LEVEL;
}

// Subject difficulty on a 1-10 scale. Audience subjects (juvenile, higher education)
// also set a band the result is clamped into: a children's book about philosophy is
// still a children's book.
export function subjectDifficulty(subjects: XpSubject[]): number {
    const base = weightedAverage(subjects) ?? cfg.DEFAULT_DIFFICULTY;
    const level = audienceLevel(subjects);
    if (level === null) return clampDifficulty(base);
    return clampDifficulty(clamp(base, level - cfg.AUDIENCE_BAND, level + cfg.AUDIENCE_BAND));
}

// Maps an average community rating (1-5) onto the 1-10 difficulty scale.
export function ratingToDifficulty(average: number): number {
    const t = (clamp(average, cfg.MIN_RATING, cfg.MAX_RATING) - cfg.MIN_RATING) / (cfg.MAX_RATING - cfg.MIN_RATING);
    return cfg.MIN_DIFFICULTY + t * (cfg.MAX_DIFFICULTY - cfg.MIN_DIFFICULTY);
}

// Blends community ratings into subject difficulty. The more ratings, the more they
// count: weight = count / (count + RATING_PRIOR).
export function blendDifficulty(subjectScore: number, rating?: CommunityRating | null): number {
    if (!rating || rating.count <= 0) return subjectScore;
    const weight = rating.count / (rating.count + cfg.RATING_PRIOR);
    return clampDifficulty((1 - weight) * subjectScore + weight * ratingToDifficulty(rating.average));
}

// Maps difficulty (1-10) linearly onto the multiplier range; the default difficulty maps to 1.0.
export function difficultyMultiplier(difficulty: number): number {
    const d = clampDifficulty(difficulty);
    const { MIN_DIFFICULTY_MULTIPLIER: lo, MAX_DIFFICULTY_MULTIPLIER: hi, DEFAULT_DIFFICULTY: mid } = cfg;
    return d <= mid
        ? lo + (d - cfg.MIN_DIFFICULTY) / (mid - cfg.MIN_DIFFICULTY) * (1 - lo)
        : 1 + (d - mid) / (cfg.MAX_DIFFICULTY - mid) * (hi - 1);
}

// Length score with diminishing returns.
export function lengthScore(pageCount: number): number {
    return Math.pow(pageCount, cfg.PAGE_EXPONENT);
}

export function calculateXp(input: XpInput): XpResult {
    const subjects = input.subjects ?? [];
    const pageCount = input.pageCount ?? null;
    const formatDensity = input.formatDensity ?? cfg.DEFAULT_FORMAT_DENSITY;
    const juvenile = isJuvenile(subjects);
    const density = formatDensity * (juvenile ? cfg.JUVENILE_DENSITY : 1);
    const subjectScore = subjectDifficulty(subjects);
    const communityRating = input.communityRating?.count ? input.communityRating : null;
    const difficulty = blendDifficulty(subjectScore, communityRating);
    const multiplier = difficultyMultiplier(difficulty);
    const length = pageCount ? lengthScore(pageCount) : null;

    return {
        // Without a page count there is nothing to scale, and 0 would be a wrong score, not an unknown one.
        xp: length === null ? null : Math.round(length * density * multiplier * cfg.XP_SCALE),
        xpVersion: cfg.XP_VERSION,
        breakdown: {
            pageCount,
            lengthScore: length,
            formatDensity,
            juvenile,
            density,
            subjectDifficulty: subjectScore,
            communityDifficulty: communityRating ? ratingToDifficulty(communityRating.average) : null,
            difficulty,
            difficultyMultiplier: multiplier,
        },
    };
}
