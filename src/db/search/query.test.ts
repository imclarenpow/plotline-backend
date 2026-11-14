import { describe, expect, test } from 'bun:test';
import { searchWords, toTsQuery } from './query.ts';

describe("toTsQuery", () => {
    test("requires every word; only the last is a prefix", async () => {
        expect(toTsQuery('Harry Pott')).toBe('harry & pott:*');
        expect(toTsQuery('dune')).toBe('dune:*');
    });

    test("keeps short words and stopwords, which the 'simple' config indexes", async () => {
        expect(toTsQuery('It')).toBe('it:*');
        expect(toTsQuery('The Lord of the Rings')).toBe('the & lord & of & rings:*');
        expect(toTsQuery('Saga Vol 1')).toBe('saga & vol & 1:*');
    });

    test("strips tsquery operators so input can't change the query", async () => {
        expect(toTsQuery("dune & !messiah | (children):* <-> 'x'")).toBe('dune & messiah & children & x:*');
    });

    test("keeps accented letters and other scripts", async () => {
        expect(toTsQuery('Astérix')).toBe('astérix:*');
        expect(toTsQuery('ワンピース')).toBe('ワンピース:*');
    });

    test("returns null when there are no words", async () => {
        expect(toTsQuery('  ')).toBeNull();
        expect(toTsQuery('?!')).toBeNull();
    });
});

describe("searchWords", () => {
    test("lowercases, splits on anything but letters and digits, and drops repeats", async () => {
        expect(searchWords('The Cat, the HAT!')).toEqual(['the', 'cat', 'hat']);
    });
});
