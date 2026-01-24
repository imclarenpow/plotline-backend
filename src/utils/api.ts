export async function jsonResponse(data: any): Promise<Response> {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
    });
}