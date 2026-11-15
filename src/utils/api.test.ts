import { describe, expect, spyOn, test } from 'bun:test';
import { errorResponse, HttpError, jsonResponse } from './api.ts';

describe("jsonResponse", () => {
    test("serialises data as JSON with the JSON content type", async () => {
        const res = await jsonResponse({ title: 'Dune', pages: 612 });
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/json');
        expect(await res.json()).toEqual({ title: 'Dune', pages: 612 });
    });

    test("takes a status", async () => {
        expect((await jsonResponse({}, 201)).status).toBe(201);
    });
});

describe("errorResponse", () => {
    test("uses an HttpError's status and message", async () => {
        const res = await errorResponse(new HttpError(404, 'Work not found'));
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ error: 'Work not found' });
    });

    test("answers anything else with 500", async () => {
        const log = spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = await errorResponse(new Error('boom'));
            expect(res.status).toBe(500);
            expect(await res.json()).toEqual({ error: 'boom' });
        } finally {
            log.mockRestore();
        }
    });
});
