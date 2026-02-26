import { expect, test, describe, beforeAll } from "bun:test";

const hasRedisEnv = !!process.env.REDIS_URL;

if (!hasRedisEnv) {
    describe.skip("cleanWorkOlid", () => {
        test("skipped because Redis is not configured", () => {});
    });

    describe.skip("transformBookOLDataToDBFormat", () => {
        test("skipped because Redis is not configured", () => {});
    });
} else {
    let cleanWorkOlid: (workKey: string) => Promise<string> | string;
    let transformBookOLDataToDBFormat: (bookData: any) => Promise<any>;

    beforeAll(async () => {
        const utils = await import("./utils.ts");
        cleanWorkOlid = utils.cleanWorkOlid;
        transformBookOLDataToDBFormat = utils.transformBookOLDataToDBFormat;
    });

    describe("cleanWorkOlid", () => {
        test("should remove /works/ prefix from OLID", async () => {
            const result = await cleanWorkOlid("/works/OL123456W");
            expect(result).toBe("OL123456W");
        });

        test("should handle OLID without prefix", async () => {
            const result = await cleanWorkOlid("OL123456W");
            expect(result).toBe("OL123456W");
        });

        test("should return empty string for /works/ only", async () => {
            const result = await cleanWorkOlid("/works/");
            expect(result).toBe("");
        });
    });

    describe("transformBookOLDataToDBFormat", () => {
        test("should transform valid book data to DB format", async () => {
            const bookData = {
                title: "The Great Gatsby",
                description: "A classic novel",
                number_of_pages: 180,
                key: "/works/OL123456W",
                covers: [12345],
                identifiers: { isbn: "123456789" }
            };

            const result = await transformBookOLDataToDBFormat(bookData);

            expect(result).toHaveProperty("title");
            expect(result).toHaveProperty("bio");
            expect(result).toHaveProperty("number_of_pages");
            expect(result).toHaveProperty("work_id");
            expect(result).toHaveProperty("cover_id");
            expect(result).toHaveProperty("sources");
        });

        test("should throw error for null book data", async () => {
            await expect(
                transformBookOLDataToDBFormat(null)
            ).rejects.toThrow("No book data provided");
        });

        test("should handle missing optional fields", async () => {
            const bookData = {
                title: "Minimal Book",
                key: "/works/OL999999W"
            };

            const result = await transformBookOLDataToDBFormat(bookData);

            expect(result.number_of_pages).toBe(0);
            expect(result.cover_id).toBeNull();
            expect(result.sources).toBeDefined();
        });

        test("should clean title string", async () => {
            const bookData = {
                title: "  Book\nWith\tWhitespace  ",
                key: "/works/OL123456W"
            };

            const result = await transformBookOLDataToDBFormat(bookData);

            expect(result.title).toBe("Book With Whitespace");
        });

        test("should handle missing covers array", async () => {
            const bookData = {
                title: "No Cover Book",
                key: "/works/OL123456W"
            };

            const result = await transformBookOLDataToDBFormat(bookData);

            expect(result.cover_id).toBeNull();
        });

        test("should use first cover from covers array", async () => {
            const bookData = {
                title: "Multi Cover Book",
                key: "/works/OL123456W",
                covers: [111, 222, 333]
            };

            const result = await transformBookOLDataToDBFormat(bookData);

            expect(result.cover_id).toBe(111);
        });
    });
}
