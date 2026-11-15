// ISBN normalisation shared by every importer. Every source matches editions on ISBN-13,
// so ISBN-10s are converted, and values with a bad check digit are dropped.

function digitsOnly(raw: string): string {
    return raw.replace(/[\s-]/g, '').toUpperCase();
}

function isbn13CheckDigit(first12: string): number {
    const sum = [...first12].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10;
}

export function normalizeIsbn13(raw: string): string | null {
    const isbn = digitsOnly(raw);
    if (!/^97[89]\d{10}$/.test(isbn)) return null;
    return isbn13CheckDigit(isbn.slice(0, 12)) === Number(isbn[12]) ? isbn : null;
}

export function normalizeIsbn10(raw: string): string | null {
    const isbn = digitsOnly(raw);
    if (!/^\d{9}[\dX]$/.test(isbn)) return null;
    const sum = [...isbn].reduce((acc, ch, i) => acc + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0);
    return sum % 11 === 0 ? isbn : null;
}

// Expects a normalised ISBN-10.
export function isbn10To13(isbn10: string): string {
    const body = `978${isbn10.slice(0, 9)}`;
    return `${body}${isbn13CheckDigit(body)}`;
}
