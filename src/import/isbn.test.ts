import { describe, expect, test } from 'bun:test';
import { isbn10To13, normalizeIsbn10, normalizeIsbn13 } from './isbn.ts';

describe("ISBN normalisation", () => {
    test("accepts valid ISBN-13s, stripping hyphens and spaces", async () => {
        expect(normalizeIsbn13('978-0-441-01359-3')).toBe('9780441013593');
        expect(normalizeIsbn13(' 9781607066019 ')).toBe('9781607066019');
    });

    test("rejects ISBN-13s with a bad check digit or prefix", async () => {
        expect(normalizeIsbn13('9780441013594')).toBeNull();
        expect(normalizeIsbn13('1234567890123')).toBeNull();
        expect(normalizeIsbn13('97804410135')).toBeNull();
    });

    test("accepts valid ISBN-10s, including an X check digit", async () => {
        expect(normalizeIsbn10('0-441-01359-7')).toBe('0441013597');
        expect(normalizeIsbn10('080442957x')).toBe('080442957X');
    });

    test("rejects ISBN-10s with a bad check digit", async () => {
        expect(normalizeIsbn10('0441013598')).toBeNull();
    });

    test("converts ISBN-10 to ISBN-13", async () => {
        expect(isbn10To13('0441013597')).toBe('9780441013593');
        expect(normalizeIsbn13(isbn10To13('080442957X'))).not.toBeNull();
    });
});
