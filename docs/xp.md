# Plotpoints (XP)

> **Status: designed, not built.** `src/utils/book/plotpoints.ts` is still empty. The data it needs is in place: `formats.density`, `subjects`, `subject_categories` and `work_signals`. The build order is in [todo.md](todo.md).

XP rewards the **effort** of reading a book. Effort is mostly length, adjusted for how dense the format is and how hard the book is to read.

## Formula

```
xp = f(pages) × density(format) × difficulty
```

| Part | Source | Notes |
|---|---|---|
| `f(pages)` | `works.page_count` | Diminishing returns, e.g. `pages^0.8`, so a very long book doesn't dwarf everything else |
| `density` | `formats.density` | prose 1.00, comic 0.60, manga 0.35, picture_book 0.20 (starting guesses). Unknown format uses 1.00, so a missed comic scores no worse than before formats existed |
| `difficulty` | subjects, audience, ratings | A narrow multiplier, roughly 0.6–1.5 |

Every stored score records its formula version in `works.xp_version`. XP already earned is copied into `user_reads.xp_awarded`, so changing the formula never changes a user's total.

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
Only ~26 subjects are audience subjects, so most books never match one. When one does match, apply it as a cap or floor:
- juvenile, children's or primary-reader subject → cap difficulty low
- higher-education or textbook subject → raise the floor

Watch for topic subjects that look like audience subjects: `Children`, `Teenagers` and `Infants` can describe what a book is *about*.

### Community ratings
Once a work has enough rows in `difficulty_ratings`, blend them in. Over time they should outweigh subjects.

## Known limitations of subject data

- Subject values are bunched together (most domain subjects are 5–7), so subjects alone barely separate books.
- Subjects describe topic, not reading difficulty: a popular history book and an academic monograph share subjects.
- OpenLibrary subject strings are messy. Match on `subjects.normalized_name` after lowercasing and splitting on `--` and `,`.

## Calibration

Tune against real books, not by feel. Keep a hand-labelled set of 50–100 books with expected XP ranges, from picture books to *Ulysses*, including comics and manga (e.g. *Diary of a Wimpy Kid*, *Watchmen*, a *One Piece* volume, *Dune*). Keep it as a test so formula changes can't silently regress.
