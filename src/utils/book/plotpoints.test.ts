import { describe, expect, test } from 'bun:test';
import { XP_VERSION } from '../../config/xp.ts';
import type { XpInput, XpSubject } from '../../schemas/xp.ts';
import {
    audienceLevel, blendDifficulty, calculateXp, difficultyMultiplier, isJuvenile, lengthScore,
    ratingToDifficulty, subjectDifficulty
} from './plotpoints.ts';

// Category weights and subject values as seeded in db/creation/inserts/xp-values/.
const WEIGHTS = { metadata: 0.10, domain: 0.40, audience: 1.00, format: 0.30 } as const;
const subject = (name: string, category: keyof typeof WEIGHTS, value: number): XpSubject =>
    ({ name, category, value, weight: WEIGHTS[category] });

const S = {
    juvenileFiction: subject('Juvenile fiction', 'audience', 2),
    higherEducation: subject('Study and teaching (Higher)', 'audience', 7),
    pictureBooks: subject('Picture books', 'format', 2),
    storiesInRhyme: subject('Stories in rhyme', 'format', 2),
    humorousStories: subject('Humorous stories', 'format', 3),
    diaries: subject('Diaries', 'format', 5),
    cartoons: subject('Cartoons and comics', 'format', 3),
    graphicNovels: subject('Graphic novels', 'format', 3),
    fiction: subject('Fiction', 'format', 4),
    scienceFiction: subject('Science fiction', 'format', 5),
    schools: subject('Schools', 'domain', 5),
    adventure: subject('Adventure and adventurers', 'domain', 4),
    ecology: subject('Ecology', 'domain', 6),
    politics: subject('Politics and government', 'domain', 7),
    literature: subject('Literature', 'domain', 6),
    philosophy: subject('Philosophy', 'domain', 9),
    families: subject('Families', 'metadata', 4),
};

const DENSITY = { prose: 1.0, comic: 0.6, manga: 0.35, picture_book: 0.2 } as const;

describe("subjectDifficulty", () => {
    test("is the weighted average of subject values", async () => {
        // (6×0.4 + 4×0.3) / 0.7
        expect(subjectDifficulty([S.literature, S.fiction])).toBeCloseTo(3.6 / 0.7, 5);
    });

    test("defaults to 5 without subjects", async () => {
        expect(subjectDifficulty([])).toBe(5);
    });

    test("a low-weight subject barely moves the score and never drags it down", async () => {
        const without = subjectDifficulty([S.politics]);
        const withMetadata = subjectDifficulty([S.politics, subject('Congresses', 'metadata', 8)]);
        expect(withMetadata).toBeGreaterThanOrEqual(without);
        expect(withMetadata - without).toBeLessThan(0.5);
    });

    test("a juvenile audience caps difficulty, even with a hard topic", async () => {
        // weighted average would be (2 + 3.6) / 1.4 = 4.0; juvenile band tops out at 2 + 1.5
        expect(subjectDifficulty([S.juvenileFiction, S.philosophy])).toBe(3.5);
    });

    test("a higher-education audience raises the floor", async () => {
        const lowFormats = Array.from({ length: 5 }, () => S.pictureBooks);
        // weighted average would be (7 + 3) / 2.5 = 4.0; band bottoms out at 7 - 1.5
        expect(subjectDifficulty([S.higherEducation, ...lowFormats])).toBe(5.5);
    });
});

describe("community ratings", () => {
    test("map 1-5 onto the 1-10 difficulty scale", async () => {
        expect(ratingToDifficulty(1)).toBe(1);
        expect(ratingToDifficulty(3)).toBe(5.5);
        expect(ratingToDifficulty(5)).toBe(10);
    });

    test("a few ratings barely move difficulty; many ratings dominate", async () => {
        const subjects = 5;
        const few = blendDifficulty(subjects, { average: 5, count: 1 });
        const many = blendDifficulty(subjects, { average: 5, count: 200 });
        expect(few - subjects).toBeLessThan(0.5);
        expect(many).toBeGreaterThan(9.5);
    });

    test("no ratings leaves subject difficulty unchanged", async () => {
        expect(blendDifficulty(4.2, null)).toBe(4.2);
        expect(blendDifficulty(4.2, { average: 5, count: 0 })).toBe(4.2);
    });
});

describe("difficultyMultiplier", () => {
    test("maps 1 → 0.4, 5 → 1.0, 10 → 2.0", async () => {
        expect(difficultyMultiplier(1)).toBeCloseTo(0.4, 10);
        expect(difficultyMultiplier(5)).toBeCloseTo(1.0, 10);
        expect(difficultyMultiplier(10)).toBeCloseTo(2.0, 10);
    });

    test("clamps out-of-range difficulty", async () => {
        expect(difficultyMultiplier(-3)).toBeCloseTo(0.4, 10);
        expect(difficultyMultiplier(42)).toBeCloseTo(2.0, 10);
    });
});

describe("juvenile books", () => {
    test("are detected from audience subjects at level 3 or below", async () => {
        expect(isJuvenile([S.juvenileFiction, S.fiction])).toBe(true);
        expect(isJuvenile([subject('Readers', 'audience', 3)])).toBe(true);
    });

    test("YA, higher-education and books without audience subjects are not juvenile", async () => {
        expect(isJuvenile([subject('Teenagers', 'audience', 4)])).toBe(false);
        expect(isJuvenile([S.higherEducation])).toBe(false);
        expect(isJuvenile([S.fiction, S.politics])).toBe(false);
    });

    test("audienceLevel averages the audience subjects only", async () => {
        expect(audienceLevel([S.juvenileFiction, S.higherEducation, S.philosophy])).toBe(4.5);
        expect(audienceLevel([S.fiction])).toBeNull();
    });

    test("have their page value halved", async () => {
        const adult = calculateXp({ pageCount: 224, formatDensity: DENSITY.prose, subjects: [S.schools] });
        const juvenile = calculateXp({ pageCount: 224, formatDensity: DENSITY.prose, subjects: [S.schools, S.juvenileFiction] });
        expect(juvenile.breakdown.density).toBe(0.5);
        // same density halving, plus the juvenile difficulty cap
        expect(juvenile.xp!).toBeLessThan(adult.xp! * 0.5);
    });
});

describe("calculateXp", () => {
    test("returns null XP, not 0, when the page count is unknown", async () => {
        const result = calculateXp({ pageCount: null, subjects: [S.fiction] });
        expect(result.xp).toBeNull();
        expect(result.xpVersion).toBe(XP_VERSION);
    });

    test("an unknown format and no subjects give pages^0.8 × 10", async () => {
        expect(calculateXp({ pageCount: 300 }).xp).toBe(Math.round(lengthScore(300) * 10));
    });

    test("format density scales XP", async () => {
        const prose = calculateXp({ pageCount: 200, formatDensity: DENSITY.prose }).xp!;
        const manga = calculateXp({ pageCount: 200, formatDensity: DENSITY.manga }).xp!;
        expect(manga).toBe(Math.round(prose * DENSITY.manga));
    });

    test("length has diminishing returns", async () => {
        const single = calculateXp({ pageCount: 600 }).xp!;
        const double = calculateXp({ pageCount: 1200 }).xp!;
        expect(double).toBeGreaterThan(single);
        expect(double).toBeLessThan(single * 2);
    });

    test("includes a breakdown for debugging and display", async () => {
        const { breakdown } = calculateXp({
            pageCount: 224, formatDensity: DENSITY.prose,
            subjects: [S.juvenileFiction], communityRating: { average: 2, count: 10 },
        });
        expect(breakdown.pageCount).toBe(224);
        expect(breakdown.formatDensity).toBe(1);
        expect(breakdown.juvenile).toBe(true);
        expect(breakdown.density).toBe(0.5);
        expect(breakdown.subjectDifficulty).toBe(2);
        expect(breakdown.communityDifficulty).toBe(ratingToDifficulty(2));
        expect(breakdown.difficulty).toBeCloseTo((2 + ratingToDifficulty(2)) / 2, 10);
    });
});

// Calibration: real books with realistic page counts and seeded subjects. These pin the
// formula's behaviour; if a change reorders them, the change is wrong or needs a decision.
describe("calibration set", () => {
    const books = {
        pictureBook: {
            pageCount: 32, formatDensity: DENSITY.picture_book,
            subjects: [S.pictureBooks, S.storiesInRhyme, S.juvenileFiction],
        },
        onePieceVol1: {
            pageCount: 208, formatDensity: DENSITY.manga,
            subjects: [S.cartoons, S.adventure, S.graphicNovels],
        },
        diaryOfAWimpyKid: {
            pageCount: 224, formatDensity: DENSITY.prose,
            subjects: [S.juvenileFiction, S.humorousStories, S.diaries, S.schools, S.families],
        },
        watchmen: {
            pageCount: 416, formatDensity: DENSITY.comic,
            subjects: [S.graphicNovels, S.scienceFiction, S.politics],
        },
        dune: {
            pageCount: 612, formatDensity: DENSITY.prose,
            subjects: [S.scienceFiction, S.ecology, S.politics, S.fiction],
        },
        ulysses: {
            pageCount: 730, formatDensity: DENSITY.prose,
            subjects: [S.fiction, S.literature],
            communityRating: { average: 4.8, count: 50 },
        },
    } satisfies Record<string, XpInput>;
    const xp = Object.fromEntries(
        Object.entries(books).map(([name, input]) => [name, calculateXp(input).xp!])
    ) as Record<keyof typeof books, number>;

    test("ranks books by reading effort", async () => {
        const ranked = Object.entries(xp).sort(([, a], [, b]) => a - b).map(([name]) => name);
        expect(ranked).toEqual(['pictureBook', 'onePieceVol1', 'diaryOfAWimpyKid', 'watchmen', 'dune', 'ulysses']);
    });

    test("Watchmen earns well over double Diary of a Wimpy Kid", async () => {
        // ~6-10 h of dense reading vs ~1 h of large type and cartoons
        expect(xp.watchmen).toBeGreaterThan(xp.diaryOfAWimpyKid * 2.5);
    });

    test("a manga volume earns less than a children's novel of similar length", async () => {
        expect(xp.onePieceVol1).toBeLessThan(xp.diaryOfAWimpyKid);
    });

    test("scores stay in their expected ranges", async () => {
        expect(xp.pictureBook).toBeWithin(5, 20);
        expect(xp.onePieceVol1).toBeWithin(150, 250);
        expect(xp.diaryOfAWimpyKid).toBeWithin(200, 400);
        expect(xp.watchmen).toBeWithin(600, 1000);
        expect(xp.dune).toBeWithin(1500, 2400);
        expect(xp.ulysses).toBeWithin(2800, 4200);
    });
});
