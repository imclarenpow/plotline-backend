# Plotpoints (XP)

Plotpoints for books are calculated from a subject-based heuristic.

## Overview

Each book can have one or more subjects. Each subject has:

1. A base difficulty value (`value`)
2. A category (`audience`, `format`, `domain`, `metadata`)
3. A category weight (`weight`) that scales the base value up or down

The category weight represents how strongly that subject type reflects perceived reading difficulty.

## Core Formula

For each subject:

$$
weighted\_subject\_xp = subject\_value \times category\_weight
$$

Then the book XP is derived from the weighted subject values (for example, sum or average depending on the final tuning strategy).

## Category Weighting Philosophy

The weighting is intentionally opinionated:

1. `audience` has the highest weight
2. `format` has moderate weight
3. `domain` has lower-to-moderate weight
4. `metadata` has very low (near-zero) weight

Rationale:

1. `audience` (for example, juvenile vs advanced audience) is the strongest signal of perceived difficulty.
2. `format` (for example, textbook, reference, fiction type) can influence complexity, but less than audience.
3. `domain` contributes some signal, but is not the dominant indicator by itself.
4. `metadata` is mostly descriptive context and should have minimal effect on difficulty.

## Why Decimal Weights

Weights are decimal values so the model can be tuned gradually rather than in big jumps.

This allows:

1. Fine-grained balancing over time
2. Easy experimentation without changing the underlying subject scores
3. Clear control over raising/lowering perceived difficulty per category

## Example (Illustrative)

If a subject has `value = 6`:

1. With `audience` weight `1.20` -> `7.2`
2. With `format` weight `0.80` -> `4.8`
3. With `domain` weight `0.55` -> `3.3`
4. With `metadata` weight `0.10` -> `0.6`

These are example values only; final weights should be calibrated with real catalog behavior.