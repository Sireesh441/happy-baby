// Applied to the public, read-only product-browsing endpoints so the mobile
// app (and other clients) can fetch them cross-origin. Deliberately not
// applied to authenticated/mutating routes (auth, cart, orders, admin writes) —
// those rely on same-origin cookie sessions, which "*" can't carry anyway.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function withCors<T extends Response>(response: T): T {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
