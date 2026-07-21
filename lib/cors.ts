// Applied to endpoints meant to be called cross-origin from the mobile app
// (including its web build): public product-browsing, and mobile-auth, which
// returns a bearer token instead of setting a cookie so "*" doesn't leak any
// session. Deliberately not applied to NextAuth's cookie-session routes (web
// login, cart, orders, admin writes) — those rely on same-origin cookies,
// which "*" can't carry cross-origin anyway.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
