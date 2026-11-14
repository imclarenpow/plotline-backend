import { describe, expect, test } from 'bun:test';
import { toBooleanQuery } from './query.ts';

describe("toBooleanQuery", () => {
    test("requires every word, as a prefix", async () => {
        expect(toBooleanQuery('Harry Pott')).toBe('+harry* +pott*');
    });

    test("drops stopwords and words shorter than the index's minimum", async () => {
        expect(toBooleanQuery('The Lord of the Rings')).toBe('+lord* +rings*');
        expect(toBooleanQuery('Saga Vol 1')).toBe('+saga* +vol*');
    });

    test("strips boolean-mode operators so input can't change the query", async () => {
        expect(toBooleanQuery('-dune +"messiah" (children)~')).toBe('+dune* +messiah* +children*');
    });

    test("keeps accented letters and other scripts", async () => {
        expect(toBooleanQuery('Astérix')).toBe('+astérix*');
        expect(toBooleanQuery('ワンピース')).toBe('+ワンピース*');
    });

    test("returns null when no word is usable", async () => {
        expect(toBooleanQuery('It')).toBeNull();
        expect(toBooleanQuery('  ')).toBeNull();
    });
});
