export async function cleanString(rawStr: string): Promise<string | null> {
    if (typeof rawStr === 'string') {
        return rawStr.replace(/[\r\n\t]/g, ' ').trim();
    } else {
        return null; // if not a string return null.
    }
}