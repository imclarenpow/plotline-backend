# Plotpoints (XP)

> **Status: formula built, not wired up.** `calculateXp()` in `src/utils/book/plotpoints.ts` is implemented and tested. Nothing calls it yet: collecting each book's page count, format and subjects from the sources comes next (see [todo.md](todo.md)).

## Where it lives

| File | Contains |
|---|---|
| `src/utils/book/plotpoints.ts` | `calculateXp(input)` plus each step as its own pure function. No database or network access |
| `src/config/xp.ts` | Every tunable: page exponent, scale, multiplier range, audience band, rating prior. **Bump `XP_VERSION` when any of them change** |
| `src/schemas/xp.ts` | `XpInput` (page count, format density, matched subjects, community rating) and `XpResult` (score, version, breakdown) |
| `src/utils/book/plotpoints.test.ts` | Unit tests for each rule plus the calibration set |

`calculateXp` returns `xp: null` (not 0) when the page count is unknown, and a `breakdown` of every intermediate value for debugging or display.

XP rewards the **effort** of reading a book. Effort is mostly length, adjusted for how dense the format is and how hard the book is to read.

## Formula

```
xp = f(pages) × density(format) × difficulty
```

| Part | Source | Notes |
|---|---|---|
| `f(pages)` | `works.page_count` | Diminishing returns, e.g. `pages^0.8`, so a very long book doesn't dwarf everything else |
| `density` | `formats.density`, audience | prose 1.00, comic 0.60, manga 0.35, picture_book 0.20 (starting guesses). Unknown format uses 1.00, so a missed comic scores no worse than before formats existed. **Halved for juvenile books** (see below) |
| `difficulty` | subjects, audience, ratings | Scored 1–10, then mapped to a multiplier: 1 → 0.4, 5 → 1.0, 10 → 2.0 |

The result is multiplied by `XP_SCALE` (10) and rounded. A 300-page prose book of average difficulty is worth about 960 XP.

**XP is not reading time.** Reading time informs it, but the page exponent (0.8) deliberately compresses long books, because finishing and engaging with a book matters as well as hours spent. Don't tune towards XP ∝ hours.

### Juvenile density
Children's and middle-grade books have large type and illustrations, so their pages hold far fewer words: *Diary of a Wimpy Kid* is ~20k words over 224 pages, while *Dune* is ~190k over 612. A book counts as juvenile when its audience subjects average 3 or below (`Juvenile fiction` = 2, `Readers` = 3), and its density is multiplied by `JUVENILE_DENSITY` (0.5). YA subjects (`Teenagers`, `Youth` = 4) don't count: their pages are normal. Picture books get both their own low format density and the juvenile halving.

### Versions
Every stored score records its formula version in `works.xp_version`. v1 was the initial formula; v2 widened the difficulty multiplier from 0.6–1.5 to 0.4–2.0 and added juvenile density, because v1 scored *Watchmen* only 1.2× *Diary of a Wimpy Kid*. XP already earned is copied into `user_reads.xp_awarded`, so changing the formula never changes a user's total.

## Difficulty

### Subject weighting
Each subject has a difficulty `value` (1–10) and a category with a `weight`:

| Category | Weight | Meaning |
|---|---|---|
| audience | 1.00 | Who the book is for (juvenile, primary readers, higher education). The strongest signal |
| domain | 0.40 | Topic, e.g. History, Algebra |
| format | 0.30 | Textbook, fiction type |
| metadata | 0.10 | Descriptive context; near-zero effect |

Combine subjects with a **weighted average**, so the weight controls how much a subject counts without changing its 1–10 scale:

```
subject_difficulty = Σ(value × weight) / Σ(weight)
```

Don't multiply each value by its weight and then average the results. That would make low-weight subjects pull the score *down* (a metadata subject worth 8 would become 0.8).

### Audience is a rule, not just a weight
Only ~26 subjects are audience subjects, so most books never match one. When one does, the subject difficulty is clamped to within `AUDIENCE_BAND` (1.5) of the audience subjects' average value:
- `Juvenile fiction` (2) → difficulty capped at 3.5, even for a children's book about philosophy
- `Study and teaching (Higher)` (7) → difficulty floored at 5.5

Watch for topic subjects that look like audience subjects: `Children`, `Teenagers` and `Infants` can describe what a book is *about*.

### Community ratings
The average rating from `difficulty_ratings` (1–5, mapped to 1–10) is blended with subject difficulty, weighted `count / (count + 10)`. One rating barely moves the score, 10 ratings count for half, and 90 ratings count for 90%.

## Known limitations of subject data

- Subject values are bunched together (most domain subjects are 5–7), so subjects alone barely separate books.
- Subjects describe topic, not reading difficulty: a popular history book and an academic monograph share subjects.
- OpenLibrary subject strings are messy. Match on `subjects.normalized_name` after lowercasing and splitting on `--` and `,`.

## Calibration

Tune against real books, not by feel. The calibration set in `plotpoints.test.ts` uses real page counts and seeded subject values, and checks both the ranking and each book's range:

| Book | Pages | Format | Difficulty | XP |
|---|---|---|---|---|
| Picture book (juvenile) | 32 | picture_book | 2.0 | 9 |
| *One Piece* vol. 1 | 208 | manga | 3.4 | 190 |
| *Diary of a Wimpy Kid* (juvenile) | 224 | prose | 3.2 | 279 |
| *Watchmen* | 416 | comic | 5.2 | 777 |
| *Dune* | 612 | prose | 5.6 | 1,914 |
| *Ulysses* (50 ratings, avg 4.8) | 730 | prose | 8.8 | 3,443 |

If a change reorders these, the change is wrong or needs a deliberate decision. The tests also require *Watchmen* to earn more than 2.5× *Wimpy Kid*.

Known gap: every comic shares one density, but *Watchmen* (nine-panel pages, prose chapters) is much denser than a typical comic. Fixing that needs per-book data: GCD's story types, or how long users actually take (`user_reads` start and finish times). Grow the set towards 50–100 books as real data comes in, especially comics and manga.
