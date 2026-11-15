export async function cleanString(rawStr: string): Promise<string | null> {
    if (typeof rawStr === 'string') {
        return rawStr.replace(/[\r\n\t]/g, ' ').trim();
    } else {
        return null; // if not a string return null.
    }
}

// Removes items with a repeated key; the last one wins, in first-seen order.
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
    return [...new Map(items.map(item => [key(item), item])).values()];
}
