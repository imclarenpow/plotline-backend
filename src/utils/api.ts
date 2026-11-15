export async function jsonResponse(data: any, status = 200): Promise<Response> {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// An error with the HTTP status the route should answer with. Anything else thrown is a 500.
export class HttpError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

// What every route's catch returns: { error } with the HttpError's status, or 500.
export function errorResponse(error: unknown): Promise<Response> {
    const status = error instanceof HttpError ? error.status : 500;
    const message = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
    if (status >= 500) console.error(error);
    return jsonResponse({ error: message }, status);
}
