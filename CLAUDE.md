@AGENTS.md

# Happy Baby — Multi-Repo Project Context

Happy Baby is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-08-09.

**You are here:** `happy-baby` — the Next.js web app + core backend, the
most mature and only currently-deployed repo. See its detailed section
below.

**Status as of 2026-08-09:** confirmed live in production via a full
end-to-end walkthrough — signup, login, mobile-auth JWT endpoints, products,
cart, orders, and Razorpay (real signature verification against a real
completed test-mode payment; `RAZORPAY_KEY_SECRET` is correctly configured
in production). The admin panel at `/admin/returns` is live and correctly
displays return cases (with packing/unboxing proof + images) sourced from
`happy-baby-returns-protection`'s API. Both `happy-baby-fit-engine` and
`happy-baby-returns-protection` are now wired into and confirmed working
from the mobile app (`happy-baby-app`); `happy-baby-tryon-service` is wired
into and confirmed working from **this repo's** `/api/try-on`, which the
mobile app calls unchanged. See "Cross-repo integration facts" below — the
older "none of the three are wired in yet" framing is stale.

All five repos live as sibling folders under
`C:\Users\SireeshGadde\OneDrive - RiskSpan\Desktop\`.

## ⚠️ Known trap: happy-baby-app is nested inside itself

`Desktop\happy-baby-app\` is **two separate git repos**:

- The outer `happy-baby-app\` is a near-empty Expo template — a single commit
  ("Sync the default project template from ..."), plus an untracked, unused
  `src/` from the default scaffold. It is not where the real app lives.
- The actual app — all screens, the working checkout flow, try-on, etc. — is
  one level deeper, at `happy-baby-app\happy-baby-app\`, with its own `.git`
  and real commit history.

Always `cd` into the **inner** `happy-baby-app\happy-baby-app\` to do
anything with the mobile app. The outer copy appears to be leftover from
however the project was first scaffolded and hasn't been cleaned up. Not
touched/cleaned up yet — flagging only.

## Resolved: duplicate happy-baby-tryon-service folder (2026-08-02)

A second, incomplete tryon-service scaffold was found at
`OneDrive - RiskSpan\Desktop\happy-baby-tryon-service\` — dated 2026-07-31
(three days before the real one was built), no git repo, only two source
files (`src/middleware/auth.ts` and `src/providers/types.ts`, no routes, no
entry point), using `@gradio/client` as its provider-integration approach
and deliberately **requiring JWT auth** on the try-on endpoint ("since
every call here triggers real paid inference time" — a design choice the
current implementation does not have).

It was deleted after confirming there was no unrecovered work of value in
it. If an empty `OneDrive - RiskSpan\Desktop\happy-baby-tryon-service\`
directory still exists, it's a harmless leftover — OneDrive held a lock on
removing the empty directory shell itself even after all its contents were
deleted. **The real tryon-service repo lives under plain `Desktop\`, not
`OneDrive - RiskSpan\Desktop\`** (unlike this repo and the other three) —
full git history, pushed to GitHub, verified end-to-end.

**Worth reconsidering given what the abandoned scaffold implies — now more
urgent, not less (re-confirmed 2026-08-09):** the current tryon-service
implementation still has no authentication on `POST /api/try-on`
(`src/middleware/` only has `errorHandler.ts`, no JWT check anywhere). The
earlier scaffold's design (requiring the same JWT this app issues) was
reasoned about deliberately — try-on calls cost real inference money — and
that reasoning is still valid even though that scaffold itself was
abandoned. This is no longer a hypothetical: tryon-service is now
confirmed to be the **real, live production try-on path** (this app's
`/api/try-on` proxies every real request to it), so every unauthenticated
call there already triggers real Hugging Face inference cost. Adding JWT
auth, consistent with how fit-engine and returns-protection already do it,
is the clearest open security gap across all five repos right now.

## Repos

| # | Repo | Role | Status |
|---|------|------|--------|
| 1 | `happy-baby` | Next.js web app + core backend (Vercel, production) | Live, most mature |
| 2 | `happy-baby-app` (inner copy) | Expo React Native mobile app (SDK 54) | Live end-to-end walkthrough completed: auth, cart, checkout/Razorpay, try-on, fit-engine, returns-protection all confirmed working from the app |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Family Fit Profiles + Fit Confidence Score | Deployed live on Railway, confirmed wired into the mobile app (`/api/family-profiles`, `/api/fit-score` both hit live) |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | Deployed live on Railway, Cloudinary-backed proof uploads, wired into both the mobile app (create case + upload unboxing proof) and this repo's `/admin/returns` panel |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | Deployed live on Railway, confirmed as the real production try-on path via this repo's `/api/try-on` |

## Key product strategy — "Fit Certain"

Core differentiator: (1) enhanced virtual try-on, (2) Fit Confidence Score,
(3) Family Fit Profiles (unique multi-vertical family angle — no competitor
like Myntra/Ajio has this), (4) Proof-Locked Returns — targeting the two
biggest validated complaint themes in Indian fashion e-commerce reviews
(unfair return rejections, refund transparency). Long-term: package
fit-engine, returns-protection, and tryon-service as standalone B2B SaaS for
other e-commerce brands once proven inside Happy Baby.

## Cross-repo integration facts

- **All three microservices are now wired in and confirmed live** (updated
  2026-08-09 — earlier notes here saying none of them were wired in are
  stale):
  - `happy-baby-fit-engine`: called from `happy-baby-app` (mobile) only.
    This repo (`happy-baby`) has no fit-engine integration of its own yet —
    no `FIT_ENGINE_URL`-style env var, no server code referencing it. The
    web app's product catalog still doesn't expose size charts for
    fit-engine to consume (see repo #3's detail section).
  - `happy-baby-returns-protection`: called from **both** `happy-baby-app`
    (mobile — create return case, upload unboxing proof via Cloudinary) and
    this repo's `/admin/returns` panel (`lib/returnsService.ts`, env var
    `RETURNS_SERVICE_URL`, admin-only via `requireAdminSession()`).
  - `happy-baby-tryon-service`: called from **this repo's** `/api/try-on`
    (`TRYON_SERVICE_URL` env var), which `happy-baby-app` calls unchanged —
    so tryon-service is wired into the mobile app *indirectly*, through this
    app's own route, unlike the other two which the mobile app calls
    directly.
- fit-engine and returns-protection **share one Supabase Postgres database**
  with this app. Isolation is two-layered:
  - Table names are prefixed per service (`fit_...`, `returns_...`) via
    Prisma `@@map`.
  - returns-protection additionally lives in its **own Postgres schema**
    (`returns_protection`, via `?schema=` in `DATABASE_URL`/`DIRECT_URL` plus
    an explicit `schema` option passed to the `@prisma/adapter-pg` driver at
    runtime — the pg driver doesn't read `?schema=` from the URL itself).
    fit-engine does **not** have this second layer — it only uses the
    `fit_` table prefix and lives in the `public` schema (the same schema
    this app's own tables live in). This was deliberate for
    returns-protection: sharing `public` with fit-engine caused both
    services to also share Prisma's `_prisma_migrations` bookkeeping table,
    so `migrate dev` saw the other service's migrations as unaccounted
    drift and offered to reset the whole schema.
  - tryon-service is stateless and has no database.
- Auth: `returns-protection` and `fit-engine` both verify the same Bearer JWT
  this app's `/api/mobile-auth/login` issues (same `JWT_SECRET`, same
  `{ sub, name, email }` payload shape, signed in `lib/mobileJwt.ts`) — so a
  mobile user's login token works against all of them. **There is no
  `isAdmin` claim in this JWT** — if either service needs an admin check,
  it does so via an email-allowlist against the verified `email`, not a
  token claim. Something to be aware of if this app's auth is ever extended
  with real roles: the microservices would need updating too.
- **Try-on is now consolidated onto `happy-baby-tryon-service`** (updated
  2026-08-07 — earlier notes in this file describing "two independent
  implementations" are stale). This app's own `/api/try-on` route
  (originally fal.ai, then a direct Hugging Face call) was migrated in an
  earlier session to proxy to `TRYON_SERVICE_URL` instead of calling HF
  itself — `happy-baby-app` calls this same route, unchanged on the mobile
  side. `happy-baby-tryon-service` is deployed live on Railway
  (`https://happy-baby-tryon-service-production.up.railway.app`).
  - **`TRYON_SERVICE_URL` was broken in production until 2026-08-07**: it
    was set on Vercel (Production + Preview) but to a value that failed
    almost instantly (~2.4s, not a timeout) — consistent with still being
    the code's `http://localhost:4002` fallback, which a Vercel serverless
    function can never reach. Root cause on the other end: the tryon-service
    Railway deployment itself had been serving the repo's very first
    commit (pre-Gradio-rewrite) because the real fix commit was made
    locally in an earlier session but never pushed to GitHub, and no
    public domain had ever been generated for it. All of that is fixed —
    see `happy-baby-tryon-service`'s own `CLAUDE.md` for the full
    breakdown. Fixed here specifically by removing and re-adding
    `TRYON_SERVICE_URL` via `vercel env` with the real Railway URL, then
    `vercel redeploy` (env var changes don't retroactively affect an
    already-running deployment — a fresh deploy is required).
  - Verified with a real end-to-end request through the full chain (real
    signed-up user, real product, real photo): this app's production
    `/api/try-on` → the Railway tryon-service → the live `yisol/IDM-VTON`
    Gradio Space → back, ~23s, correctly shaped `{ imageUrl }` response.

## Known technical decisions/gotchas (apply project-wide)

- Windows dev machine — PowerShell execution policy needed `RemoteSigned`.
- npm downgraded to npm@8 to fix a Windows-specific `create-expo-app` JSON
  parsing bug.
- Prisma needs `"postinstall": "prisma generate"` (and it's also run
  directly in the build script) for Vercel builds to pick up the client.
- `DATABASE_URL` must use Supabase's pooled connection (port 6543,
  `?pgbouncer=true`); `DIRECT_URL` (port 5432) is for migrations only.
- Server components must query Prisma directly, not `fetch()` their own API
  routes internally — doing the latter caused a production `ECONNREFUSED`
  crash on Vercel.
- Razorpay's React Native SDK doesn't support the mobile app's New
  Architecture setup — native mobile checkout uses a WebView loading
  Razorpay's Standard Checkout instead. `react-native-webview` has **no web
  implementation at all** (hard build failure, not a graceful degrade),
  which blocked the mobile app's Expo-web checkout entirely until fixed
  2026-08-09 by branching on `Platform.OS` and loading Razorpay's
  `checkout.js` directly on web — see `happy-baby-app`'s own `CLAUDE.md`.
- **Resolved (was open as of 2026-08-02):** `node dist/index.js` used to
  crash at runtime in both fit-engine and returns-protection — the old
  `prisma-client` generator's ESM output (`import.meta.url`) doesn't load
  cleanly under plain `node`. Both services fixed this by switching their
  Prisma generator to `prisma-client-js` (classic CommonJS output) and
  moving the generated client outside `src/`. Confirmed fixed and holding
  as of 2026-08-09 — this is what let both services actually stay up on
  Railway. Not relevant to this repo's own Prisma setup (this app's own
  `schema.prisma` already uses `prisma-client` for its main client plus a
  separate `prisma-client-js`-generated `scriptsClient` purely for
  Node-script tooling like `import-products.js` — see below), just noted
  here since it was previously flagged as a cross-repo open item.
- `FAL_API_KEY` and `HF_TOKEN` are still set as Vercel env vars on this
  project but appear to be **vestigial** — nothing in `app/` or `lib/`
  references them anymore now that `/api/try-on` just proxies to
  `TRYON_SERVICE_URL` instead of calling fal.ai or Hugging Face directly.
  Worth confirming and removing rather than assuming they're still needed.

---

## Per-repo detail

### 1. happy-baby (this repo — web + core backend)

Next.js 16 (App Router) + React 19, deployed live on Vercel
(`https://happy-baby-seven.vercel.app`, project `happy-shopping/happy-baby`).
Postgres via Supabase + Prisma 7 (`@prisma/client` + `@prisma/adapter-pg`).
NextAuth (Credentials provider, JWT session strategy) for web sessions,
custom JWT endpoints (`/api/mobile-auth/login`, `/signup`, `/me`) for the
mobile app (signing/verification in `lib/mobileJwt.ts` — payload is exactly
`{ sub, name, email }`, 30-day expiry, nothing else — no `isAdmin` claim).
Razorpay payments. Anthropic-powered "Ask Happy Baby" assistant. Cloudinary
for image hosting (product-import pipeline). Confirmed via a live
production walkthrough today (signup, login, mobile-auth, products, cart,
orders, and a real Razorpay test-mode payment with real signature
verification) plus direct reading of the source, git log (26 commits,
latest `581a79e` "Add admin Returns panel", 2026-08-08), and the actual
route listing under `app/api/`:

`addresses`, `admin/return-cases/[id]/status`, `assistant`,
`auth/[...nextauth]`, `cart`, `cart/[productId]`, `mobile-auth/login`,
`mobile-auth/me`, `mobile-auth/signup`, `orders`, `orders/[id]`, `products`,
`products/[id]`, `razorpay/create-order`, `signup`, `try-on`. (The
`admin/return-cases/[id]/status` route is new since the last update — it's
this app's server-side proxy for the admin Returns panel, not a route
returns-protection itself exposes to browsers.)

**Admin auth** (`lib/admin.ts`): a single hardcoded allowlisted email,
`isAdminEmail()` does a case-insensitive compare against
`sireesh441@gmail.com` — there's no `role` column or admin flag in the
`User` table. `lib/apiAuth.ts`'s `requireAdminSession()` combines this with
the NextAuth session and is what gates both `/admin` (product management)
and `/admin/returns` (the new Returns panel, `app/admin/returns/page.tsx` +
`ReturnsPanel.tsx`, admin-nav-linked via `AdminNav.tsx`). The Returns panel
calls into `happy-baby-returns-protection` server-side via
`lib/returnsService.ts`, minting a short-lived admin JWT from the logged-in
admin's own NextAuth session identity (not a synthetic service account) —
`fetchAllReturnCases()` (`GET /api/return-cases`) and
`updateReturnCaseStatus()` (`PATCH /api/return-cases/:id/status`). Order
data used to enrich each case (product/customer info) is looked up locally
via `lib/orders.ts` since returns-protection only knows raw
`orderId`/`itemId` numbers.

**Prisma schema** (`prisma/schema.prisma`) — 5 models, all in the `public`
schema: `User` (`users`), `Address` (`addresses`), `Product` (`products`,
with a `sizes` JSON column for per-size stock breakdown from the catalog
import, `vertical` enum `kids|men|women`, and `garmentRegion` enum
`upper_body|lower_body|dresses` used to gate which products support virtual
try-on), `CartItem` (`cart_items`), `Order` (`orders`, storing
`razorpayOrderId`/`razorpayPaymentId`/`items`/`shippingAddress` as JSON
rather than normalized line-item tables). Two Prisma generators are
configured: the main `client` generator (modern `prisma-client` output used
by the app itself, in `lib/generated/prisma`) and a separate
`scriptsClient` generator (classic `prisma-client-js`, in
`lib/generated/prisma-cjs`) used only by Node scripts like
`scripts/import-products.js` — kept separate because the app's build script
(`prisma generate --generator client && next build`) only generates the
first one, and generating both on every Vercel build would be wasted work.

### 2. happy-baby-app (mobile — use the **inner** `happy-baby-app\happy-baby-app\` copy)

Expo SDK 54, targeting native (iOS/Android) and web from one codebase.
Per its own `CLAUDE.md` (also synced to 2026-08-09) and cross-checked
against this repo: HEAD commit is `Add return flow to Order History: create
case + unboxing proof upload`, on top of earlier commits adding Family Fit
Profiles, checkout, and try-on. Two more fixes were made and verified live
today but were **not yet committed** as of that repo's last sync: (1)
checkout now branches on `Platform.OS` so web purchases work too (native
keeps the Razorpay WebView flow; web loads Razorpay's `checkout.js` script
directly via a new `src/lib/razorpay-web.ts`, since `react-native-webview`
has no web implementation at all), and (2) the post-login redirect fallback
was changed from `router.back()` (which silently no-ops with no prior nav
history) to `router.replace('/')`.

Screens (`src/app/`): tabs home, shop by vertical, product detail, cart,
account, wishlist, login/signup, checkout, razorpay-checkout (WebView,
native only), order-confirmation, order-history, family-members, try-on,
assistant. Client libs (`src/lib/`) include `fit-engine-api.ts` and
`returns-api.ts`, both hardcoding their respective Railway production URLs
as constants rather than reading an env var — a deliberate choice made to
avoid repeating the kind of localhost-fallback bug this app's own
`TRYON_SERVICE_URL` had.

**Confirmed live end-to-end today (2026-08-09)** per that repo's own notes:
signup/login against this app's production backend; full checkout +
Razorpay payment + order confirmation on both native and the newly-fixed
web path; Family Fit Profiles (create a family member, see a "100% match"
Fit Confidence Score on a product page via fit-engine); initiating a return
and uploading unboxing proof against returns-protection, with Order History
correctly reflecting status ("Proof Pending" / "Proof uploaded ✓"). Try-on
is live with a known accepted bug (garment type sometimes misclassified,
e.g. jeans rendered as a shirt) and **still calls this app's own
`/api/try-on`** rather than `happy-baby-tryon-service` directly — since
this app's `/api/try-on` now proxies to tryon-service itself, the mobile
app reaches tryon-service transitively, not via a direct call.

### 3. happy-baby-fit-engine

Express + TypeScript. Owns Family Fit Profiles and Fit Confidence Score.
Shares this app's Supabase database, isolated via `fit_`-prefixed tables
only (no separate Postgres schema — see "Cross-repo integration facts").

**Committed (7 commits through `60e651c`, clean working tree), pushed to
GitHub, and deployed live on Railway**
(`https://happy-baby-fit-engine-production.up.railway.app`, project
`amused-wisdom`, shared with returns-protection). The earlier
`node dist/index.js` production crash is fixed (switched from the
`prisma-client` generator to `prisma-client-js`) — confirmed still holding
as of 2026-08-09. Verified live with real HTTP requests against the real
Supabase database, including from the live mobile app:

- `POST /api/family-profiles`, `GET /api/family-profiles`,
  `PATCH /api/family-profiles/:id`, `DELETE /api/family-profiles/:id` — full
  CRUD, all scoped to the authenticated user's JWT `sub`. Cross-user access
  correctly returns 404 (not 403) so profile IDs can't be probed for
  existence.
- `POST /api/fit-score` — per-dimension scoring (height/weight/chest/waist/
  hip/inseam), 100 inside a size chart's range, decaying linearly outside
  it, averaged across whichever dimensions overlap. Accepts a saved
  `familyProfileId` or an inline `profile`. Age-based estimation fills in
  missing dimensions for children (0–14) from a simple lookup table when
  real measurements aren't available; explicit measurements always win.
  Nothing is persisted — stateless computation.
- **Wired only into `happy-baby-app` (mobile)**, directly (hardcoded
  Railway URL in `src/lib/fit-engine-api.ts`), not into this repo. This
  repo's product catalog still doesn't expose real per-product size charts
  — the caller must supply `sizeChart` in the `/api/fit-score` request; the
  mobile app currently works around this with a generic per-vertical chart
  rather than real per-product data. That gap is still open.

### 4. happy-baby-returns-protection

Express + TypeScript. Handles tamper-evident return proof. Shares this
app's Supabase database, isolated via **both** `returns_`-prefixed tables
and its own Postgres schema (`returns_protection`).

**Committed, pushed to GitHub, and deployed live on Railway**
(`https://happy-baby-returns-protection-production.up.railway.app`, project
`amused-wisdom`, shared with fit-engine). The `node dist/index.js`
production crash is fixed (same `prisma-client-js` switch as fit-engine).
Verified live end-to-end against the real shared Supabase database:

- `POST /api/return-cases` (creates a case linked to `orderId`/`itemId`;
  open to any authenticated user, not admin-only — changed from earlier
  notes), `GET /api/return-cases/:orderId` and `GET /api/return-cases`
  (admin-only listing, returns cases with packing + unboxing proof records
  together, chronologically ordered), `PATCH /api/return-cases/:id/status`
  (admin-only, walks through
  `proof_pending → proof_complete → dispute_open → resolved`, still fully
  manual — no auto-transition on proof completeness; that's a product
  decision, not a bug).
- `POST /api/proof` — **uploads now go to Cloudinary via multer
  memory-storage, not local disk** (changed since the last update, which
  described local `uploads/` — that's stale). Packing proof requires admin;
  unboxing proof just requires auth. `uploadedAt` is always server-set —
  verified a spoofed client timestamp is silently ignored. Records are
  immutable (no update/delete route). **The previously-known
  orphaned-file-on-rejected-upload bug is fixed / structurally
  eliminated** by the move to Cloudinary memory-storage (nothing touches
  disk before the auth check runs anymore).
- CORS is locked to `https://happy-baby-seven.vercel.app` plus
  localhost/127.0.0.1 (no-Origin requests — native mobile, server-to-server
  — bypass CORS entirely, as always).
- **Wired into both consuming apps, confirmed live 2026-08-09**:
  `happy-baby-app` (mobile, `src/lib/returns-api.ts`, hardcoded Railway URL)
  for case creation and unboxing-proof upload; this repo
  (`lib/returnsService.ts`, `RETURNS_SERVICE_URL` env var) for the admin
  `/admin/returns` panel — case listing and status updates.

### 5. happy-baby-tryon-service

Express + TypeScript. Thin provider-agnostic wrapper — deliberately no AI
model logic, just routes to whichever provider `PROVIDER` selects. Lives
under plain `Desktop\happy-baby-tryon-service\`, not
`OneDrive - RiskSpan\Desktop\` like the other four repos.

- `POST /api/try-on` (multipart `personImage` + `garmentImage`) → forwards
  to the active provider adapter, returns `{ imageUrl }`. `HuggingFaceProvider`
  talks to a Gradio Space (not a REST endpoint — free HF Spaces don't have
  one) via `@gradio/client`, configured with `HUGGINGFACE_SPACE` (not
  `HUGGINGFACE_ENDPOINT_URL`, the old, wrong design), defaulting to
  `yisol/IDM-VTON`; `SelfHostedProvider` stubbed for a future GPU server.
  `GET /health` → `{ status, provider }`.
- **Deployed live on Railway**
  (`https://happy-baby-tryon-service-production.up.railway.app`, its own
  project `laudable-charm`, separate from fit-engine/returns-protection's
  shared project) and **confirmed to be the real production try-on path**
  — hitting `/health` directly returns `{"status":"ok","provider":
  "huggingface"}`, confirming the live deployment runs current code, not a
  stale build. See "Cross-repo integration facts" above for the full story
  of what was broken (stale deployed code + a placeholder
  `TRYON_SERVICE_URL` on Vercel) and how it got fixed on 2026-08-07.
- No `railway.json`/`Procfile`/`nixpacks.toml` is committed anywhere — the
  live deployment's build/start commands, domain, and env vars
  (`HUGGINGFACE_API_KEY`, `HUGGINGFACE_SPACE`, `ALLOWED_ORIGINS`, `PORT`)
  only exist in Railway's dashboard, not as version-controlled config.
- **Still has no authentication on `POST /api/try-on`** — see the
  "Worth reconsidering" note above; this is the most concrete open risk
  across all five repos right now given it's confirmed live in production.

---

## Immediate next steps

All items from the previous update (mobile checkout verification,
committing fit-engine's CRUD work, deploying all three microservices, and
wiring them into the main app/mobile app) are now done — see "Status as of
2026-08-09" and the per-repo sections above. What's actually open now:

1. **Add JWT auth to `happy-baby-tryon-service`'s `POST /api/try-on`** —
   the clearest concrete open item. It's confirmed to be the live
   production try-on path with zero auth, meaning every unauthenticated
   caller can trigger real paid inference. Should verify the same Bearer
   JWT this app already issues, consistent with fit-engine and
   returns-protection.
2. `happy-baby-app`: commit the two 2026-08-09 fixes made and verified live
   but not yet committed as of that repo's last sync — the web-checkout
   `Platform.OS` branch and the `router.replace('/')` login-redirect fix.
3. Decide whether/how this app's product catalog should expose real
   per-product size charts for fit-engine to consume — fit-engine's
   `/api/fit-score` still requires the caller to pass one in, and the
   mobile app currently works around this with a generic per-vertical
   chart rather than real product data.
4. returns-protection: decide whether return-case status should
   auto-transition based on proof completeness, or stay fully manual (the
   previously-open orphaned-file bug is already fixed).
5. Consider removing the now-vestigial `FAL_API_KEY`/`HF_TOKEN` Vercel env
   vars on this project — nothing in `app/` or `lib/` references them
   anymore now that `/api/try-on` just proxies to `TRYON_SERVICE_URL`.
6. Consider committing tryon-service's Railway deploy config
   (build/start commands, domain, env var names) — currently only exists
   in Railway's dashboard with nothing version-controlled to reproduce it.
7. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell so the nested-repo trap described above doesn't cause confusion
   later (not touched yet — flagging only, across all repos).
