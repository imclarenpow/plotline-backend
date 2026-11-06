import { describe, expect, test } from 'bun:test';
import { jsonResponse } from './api.ts';

describe("jsonResponse", () => {
    test("serialises data as JSON with the JSON content type", async () => {
        const res = await jsonResponse({ title: 'Dune', pages: 612 });
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/json');
        expect(await res.json()).toEqual({ title: 'Dune', pages: 612 });
    });
});
