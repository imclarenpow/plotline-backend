// Tunables for the plotpoints formula (see docs/xp.md).
// Changing ANY value here changes scores: bump XP_VERSION so stored scores
// (works.xp_version) can be found and recomputed.
// v2: wider difficulty multiplier (0.4-2.0) and juvenile density.
export const XP_VERSION = 2;

// Overall scale: a 300-page prose book of average difficulty is worth ~960 XP.
export const XP_SCALE = 10;

// Length score = pages ^ PAGE_EXPONENT. Below 1 gives diminishing returns,
// so very long books don't dwarf everything else.
export const PAGE_EXPONENT = 0.8;

// Difficulty is scored 1-10 and mapped linearly onto this multiplier range.
// DEFAULT_DIFFICULTY (5) maps to exactly 1.0.
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const DEFAULT_DIFFICULTY = 5;
export const MIN_DIFFICULTY_MULTIPLIER = 0.4;
export const MAX_DIFFICULTY_MULTIPLIER = 2.0;

// Format density when the format is unknown: no adjustment.
export const DEFAULT_FORMAT_DENSITY = 1.0;

// Audience subjects (category 'audience') set a band around their value that the
// subject difficulty is clamped into: a juvenile book can't score as academic.
export const AUDIENCE_CATEGORY = 'audience';
export const AUDIENCE_BAND = 1.5;

// Juvenile books (average audience value <= JUVENILE_MAX_AUDIENCE_LEVEL, e.g.
// 'Juvenile fiction' = 2, 'Readers' = 3) have large type and illustrations, so far
// fewer words per page. Their density is multiplied by JUVENILE_DENSITY.
// YA subjects ('Teenagers', 'Youth' = 4) are not juvenile: their pages are normal.
export const JUVENILE_MAX_AUDIENCE_LEVEL = 3;
export const JUVENILE_DENSITY = 0.5;

// Community ratings (1-5) are blended in with weight count / (count + RATING_PRIOR):
// 10 ratings count for half, 90 ratings for 90%.
export const RATING_PRIOR = 10;
export const MIN_RATING = 1;
export const MAX_RATING = 5;
