@AGENTS.md

# Happy Shopping — Multi-Repo Project Context

Happy Shopping is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-09-06 (all five repos re-synced this pass).

## 🚨 All three Railway microservices are currently unreachable (found 2026-09-06)

`happy-baby-fit-engine`, `happy-baby-returns-protection`, and
`happy-baby-tryon-service` all returned Railway's own **"Application not
found"** edge error when hit directly (e.g. `GET .../health`) — not a normal
app-level 404, but Railway's proxy saying the domain no longer maps to a
running service. All three repos also have a recent, coordinated **"Rename
package identity from happy-baby to happy-shopping"** commit; the likely
cause is that rename also touched the Railway services/projects, silently
changing their auto-generated `*.up.railway.app` domains and orphaning every
hardcoded URL pointing at the old ones (this app's `TRYON_SERVICE_URL`/
`RETURNS_SERVICE_URL` env vars, and `happy-baby-app`'s hardcoded
`FIT_ENGINE_URL`/`RETURNS_SERVICE_URL` constants). `happy-baby` itself
(Vercel) is still live. **Not yet confirmed end-to-end** (no login
credentials available to drive it from this pass) whether `/api/try-on`,
`/admin/returns`, and the mobile app's fit-score/return-case flows are
actually broken in production as a result — but given the evidence, they
very likely are. **First thing to do next session: check the Railway
dashboard for these three services' real current URLs and re-point every
reference to them.**

## Update history

- **2026-09-06**: Re-synced all five repos' `CLAUDE.md` files together in one
  pass (previously only this repo had been re-synced, on 2026-08-21).
  Highlights: discovered the Railway outage above; fit-engine renamed
  `FamilyProfile` → `PersonProfile` and added photo upload; returns-protection
  and tryon-service both got the `happy-shopping` package rename;
  tryon-service's `SelfHostedProvider` is no longer a stub — it now calls a
  real RunPod-hosted CatVTON server with outfit-mode and NSFW-placeholder
  detection, though the default `PROVIDER` is still `huggingface`, which
  explicitly throws on outfit requests; `happy-baby-app` shipped 5 more
  commits (swatch-switching UI, wholesale/bulk-buying UI, expandable
  subcategory rail, full-outfit try-on mode, WhatsApp share for try-on
  results) plus a same-day fix for product photos not rendering correctly;
  this repo got a `.env.example` (real secrets were almost committed to git
  — GitHub's push protection caught a live Anthropic API key and blocked it,
  which is why `.env.example` now exists instead).
- **2026-08-21**: Re-synced this section against `happy-baby`'s actual repo
  state (git log + source read directly, not assumed from the prior entry).
  Six commits had landed since the 2026-08-09 sync (`581a79e`) that weren't
  reflected here: product variant grouping (`ProductGroup`, Amazon-style
  color swatches), wholesale/bulk-pack pricing and cart support, Excel
  import support for both, clothing subcategories + a new `/api/categories`
  endpoint, outfit (upper+lower) try-on support in `/api/try-on`, and a web
  try-on UI (`TryOnPanel.tsx`, branded Share/Download). See the expanded
  "1. happy-baby" section below for details.

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
| 1 | `happy-baby` | Next.js web app + core backend (Vercel, production) | Live, most mature; has product variant grouping, wholesale/bulk pricing, clothing subcategories, and outfit try-on (see detail section) |
| 2 | `happy-baby-app` (inner copy) | Expo React Native mobile app (SDK 54) | Feature-complete matching this repo's backend (swatches, bulk-buying, subcategory rail, outfit try-on, WhatsApp share); image-rendering bugs fixed 2026-09-06 |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Person Fit Profiles + Fit Confidence Score | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Renamed `FamilyProfile`→`PersonProfile`, added photo upload |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Otherwise feature-complete per last verification (Cloudinary uploads, admin panel wiring) |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | 🚨 Railway URL unreachable as of 2026-09-06 (see banner above). Self-hosted CatVTON provider now implemented (outfit mode + NSFW detection); still no JWT auth |

## Key product strategy — "Fit Certain"

Core differentiator: (1) enhanced virtual try-on, (2) Fit Confidence Score,
(3) Family Fit Profiles (unique multi-vertical family angle — no competitor
like Myntra/Ajio has this), (4) Proof-Locked Returns — targeting the two
biggest validated complaint themes in Indian fashion e-commerce reviews
(unfair return rejections, refund transparency). Long-term: package
fit-engine, returns-protection, and tryon-service as standalone B2B SaaS for
other e-commerce brands once proven inside Happy Shopping.

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
  - **Status as of 2026-09-06: this whole chain is presumed broken** — see
    the Railway-outage banner at the top of this file. `TRYON_SERVICE_URL`
    almost certainly still points at the old, now-dead Railway domain.
- **Package rename across the three microservices**: `happy-baby-fit-engine`,
  `happy-baby-returns-protection`, and `happy-baby-tryon-service` each have a
  recent "Rename package identity from happy-baby to happy-shopping" commit.
  This app's own `package.json`/branding was not part of that rename (not
  checked whether it should be for consistency).
- **fit-engine's `FamilyProfile` model was renamed to `PersonProfile`**
  (broadens the concept beyond just "family"). **Not verified this pass**:
  whether `happy-baby-app`'s UI copy/routes (`family-members`, "Family Fit
  Profiles") or this repo's own product-strategy language were updated to
  match, or whether this is purely a backend/schema rename so far.
- **Outfit try-on requires `PROVIDER=self-hosted` on tryon-service.**
  tryon-service's `HuggingFaceProvider` (the default) explicitly throws for
  outfit (upper+lower) requests — only the newer `SelfHostedProvider` (a real
  RunPod-hosted CatVTON server, no longer a stub) supports them. This app's
  `/api/try-on` already ships the outfit code path, and `happy-baby-app`
  already calls it. Whether Railway's `PROVIDER` env var is actually set to
  `self-hosted` could not be confirmed this pass (service unreachable — see
  banner above); if it isn't, every outfit try-on request fails outright.
- **Never commit real `.env`/`.env.local` files.** This repo's actual
  `.env.local` was briefly committed locally (never pushed) and GitHub's
  push-protection immediately flagged a live Anthropic API key inside it —
  confirming this isn't just theoretical risk. Use `.env.example` (variable
  names only) for documenting required config instead; real values live in
  Vercel's/Railway's dashboards and are recoverable from there on any
  machine (`vercel env pull .env.local` for this repo).

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
Razorpay payments. Anthropic-powered "Ask Happy Shopping" assistant. Cloudinary
for image hosting (product-import pipeline). Confirmed as of 2026-08-09 via
a live production walkthrough (signup, login, mobile-auth, products, cart,
orders, and a real Razorpay test-mode payment with real signature
verification); the 2026-08-21 update below is from direct source reading
only (git log + reading the actual files), not a fresh production
walkthrough — worth re-verifying live if picking this up.

Git log now at 32 commits, latest `9504bed` "Add web try-on flow with
branded Share/Download". Six commits landed between the 2026-08-09 sync
(`581a79e`, admin Returns panel) and now, in order: product variant
grouping (`c369db8`), wholesale/bulk-pack backend (`a97ef17`), Excel import
support for variant grouping (`37f4754`), clothing subcategories +
`/api/categories` (`0f64841`), outfit try-on support (`72b358d`), and the
web try-on UI (`9504bed`). Actual route listing under `app/api/`:

`addresses`, `admin/return-cases/[id]/status`, `assistant`,
`auth/[...nextauth]`, `cart`, `cart/[productId]`, `cart/item/[id]`,
`categories`, `mobile-auth/login`, `mobile-auth/me`, `mobile-auth/signup`,
`orders`, `orders/[id]`, `products`, `products/[id]`, `products/group/[id]`,
`razorpay/create-order`, `signup`, `try-on`. New since the last sync:
`cart/item/[id]` (removes a cart line by its own row id — the only way to
remove a bulk-pack line, which has no single `productId` to key off of),
`categories` (public, CORS-open listing of a vertical's categories +
Clothing subcategories, for the mobile app's shop screen), and
`products/group/[id]` (returns every color variant in a `ProductGroup`, for
a product-detail page's swatch picker — `GET /api/products` only returns
one representative variant per group). `admin/return-cases/[id]/status` is
this app's server-side proxy for the admin Returns panel, not a route
returns-protection itself exposes to browsers.

**New features since 2026-08-09:**

- **Product variant grouping** (`c369db8`, Day 29–30): Amazon-style color
  swatches under one listing. New `ProductGroup` model owns the shared
  listing info (name/vertical/category/description); `Product` gets a
  nullable `productGroupId` + `variantColor` (the actual physical color,
  distinct from the pre-existing `color` field, which is a Tailwind class
  used for card-background theming, not a real color — kept as-is rather
  than renamed to avoid touching every styling call site). Nullable/backward
  compatible — most existing products predate grouping and stay ungrouped
  ("a group of one"). `scripts/group-product-variants.ts` backfills groups
  by name-matching existing products.
- **Wholesale/bulk-pack pricing** (`a97ef17`, Day 31): a cart line can now be
  a "pack" (5 or 10 units) drawn from multiple variants in one
  `ProductGroup`, priced via `lib/bulkPricing.ts` — an explicit per-pack-size
  override on `ProductGroup.bulkPricing` wins, otherwise a computed default
  (~15% off for a 5-pack, ~20% off for a 10-pack, off the group's
  representative variant price). `CartItem` gained four nullable columns
  (`productGroupId`, `packSize`, `bulkBreakdown` JSON, `bulkPricePerUnit` —
  the last one a price snapshot at add-time so a later `bulkPricing` change
  doesn't retroactively reprice an item already in a cart) used together for
  a bulk line and left null for a normal single-product line.
- **Clothing subcategories + `/api/categories`** (`0f64841`): `Product`
  gained a nullable `subcategory` column (only meaningful when
  `category === "Clothing"`; allowed values per vertical live in
  `CLOTHING_SUBCATEGORIES` in `app/data/products.ts`). The new endpoint
  exposes category (and, for Clothing, subcategory) listings per vertical so
  the mobile app doesn't have to duplicate that config.
- **Outfit try-on** (`72b358d`): `/api/try-on` now accepts either a single
  `productId` (existing flow) or `upperProductId` + `lowerProductId`
  together, compositing a top and bottom onto one photo in one call —
  mirrors how tryon-service itself infers single-vs-outfit from which image
  fields are present. Also now forwards tryon-service's `422` status
  verbatim (provider responded but the photo itself was unusable, e.g. an
  NSFW-placeholder result) instead of collapsing it into a generic 502, and
  **`/api/try-on` now accepts a web NextAuth session as an alternative to
  the mobile Bearer JWT** (falls back to `getServerSession` when no valid
  JWT is present) — needed for the new web UI below, which has no JWT of
  its own. **No web UI calls the outfit path yet** — `TryOnPanel.tsx` (see
  next item) only ever sends a single `productId`; outfit try-on is
  currently API-only, presumably built ahead of a UI or for the mobile app.
- **Web try-on UI** (`9504bed`): `app/components/TryOnPanel.tsx`, a
  client component (upload photo → poll → show result) rendered on the
  product detail page, gated behind a NextAuth session (shows a "Log in to
  try this on" prompt otherwise). Result image gets a branded pink
  "Try it on Happy Shopping" footer composited on via `lib/shareTryOnImage.ts`
  before Share (Web Share API with file support, `supportsFileShare()`) or
  Download (`shareOrDownloadUrl` fallback) — compositing is skipped and it
  falls back to a plain share/download of the raw image if the result host
  doesn't allow cross-origin byte fetches for canvas compositing.
- **`product-import/`** — a new top-level folder (`images/` + `products.xlsx`)
  holding the actual Excel catalog + photos that `scripts/import-products.js`
  reads, alongside `scripts/backfill-subcategories.js` and
  `scripts/group-product-variants.ts` as one-off backfill scripts for the
  two features above.

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

**Prisma schema** (`prisma/schema.prisma`) — 6 models, all in the `public`
schema: `User` (`users`), `Address` (`addresses`), `Product` (`products`,
with a `sizes` JSON column for per-size stock breakdown from the catalog
import, `vertical` enum `kids|men|women`, `garmentRegion` enum
`upper_body|lower_body|dresses` used to gate which products support virtual
try-on, a nullable `subcategory` string meaningful only for Clothing, and
— new as of 2026-08-21 — a nullable `productGroupId` FK + `variantColor`
for variant grouping), `ProductGroup` (`product_groups`, **new**: the
shared listing info across an item's color variants, holding `bulkPricing`
JSON for wholesale overrides and a unique `sku` so the Excel import can
find/update the same group across re-runs instead of duplicating it),
`CartItem` (`cart_items`, **extended**: `productId` is now nullable and
four new nullable columns — `productGroupId`, `packSize`, `bulkBreakdown`
JSON, `bulkPricePerUnit` — carry a bulk-pack line, which has no single
product of its own), `Order` (`orders`, storing
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
Git log now at 22 commits, latest `f36819f` "Show real product photos
instead of emoji, fix cropped detail-page images" (2026-09-06, see below).
Six commits landed since the 2026-08-09 sync (`e2720fe`, return flow to
Order History): Day 30 swatch-switching UI (shop grid + product detail, for
this repo's variant-grouping feature), Day 32b wholesale/bulk-buying UI
(toggle, pack picker, cart/checkout/history), an expandable Clothing
subcategory rail, full-outfit try-on mode (`src/lib/try-on-api.ts` sends
`upperProductId`+`lowerProductId` — see the outfit-try-on/`PROVIDER` note
above), WhatsApp share for try-on results (single + batch, worked around a
`react-native-view-shot` web bug by using `html2canvas` directly), and
today's image-rendering fix.

**Bugs fixed 2026-09-06 (commit `f36819f`):** `ProductThumbnail` (used in
the shop grid, cart, wishlist, order history, and try-on picker) always
rendered the emoji placeholder and never checked `product.image`, even for
products with a real photo URL from the backend — fixed to resolve and
render the real image via the existing `getProductImageUrl()` helper,
falling back to the emoji only when a product genuinely has none.
`ProductImageCarousel` (product detail page) used `resizeMode="cover"` in a
fixed-height box, badly cropping/zooming portrait product photos — fixed to
`resizeMode="contain"` with a tile-color background fill so the whole photo
is always visible (letterboxed, not cropped). Both verified live in a local
`expo start --web` session before committing.

Screens (`src/app/`): tabs home, shop by vertical, product detail, cart,
account, wishlist, login/signup, checkout, razorpay-checkout (WebView,
native only), order-confirmation, order-history, family-members, try-on,
assistant. Client libs (`src/lib/`) include `fit-engine-api.ts` and
`returns-api.ts`, both hardcoding their respective Railway production URLs
as constants rather than reading an env var — a deliberate choice made to
avoid repeating the kind of localhost-fallback bug this app's own
`TRYON_SERVICE_URL` had. **As of 2026-09-06 those hardcoded Railway URLs are
presumed dead** — see the Railway-outage banner at the top of this file;
fit-engine and returns-protection features in this app are likely broken
until those URLs are fixed.

**Confirmed live end-to-end as of 2026-08-09** (not re-verified this pass
beyond reading the source and git log): signup/login against this app's
production backend; full checkout + Razorpay payment + order confirmation
on both native and web; Family Fit Profiles (create a family member, see a
"100% match" Fit Confidence Score on a product page via fit-engine);
initiating a return and uploading unboxing proof against
returns-protection, with Order History correctly reflecting status. Try-on
is live with a known accepted bug (garment type sometimes misclassified,
e.g. jeans rendered as a shirt) and calls this app's own `/api/try-on`,
which proxies to `happy-baby-tryon-service`.

### 3. happy-baby-fit-engine

Express + TypeScript. Owns Family Fit Profiles and Fit Confidence Score.
Shares this app's Supabase database, isolated via `fit_`-prefixed tables
only (no separate Postgres schema — see "Cross-repo integration facts").

**Committed (11 commits, clean working tree), pushed to GitHub.** Two new
commits since the 2026-08-09 sync: `FamilyProfile` renamed to
`PersonProfile` (broadens the concept beyond just "family" — **not verified
whether `happy-baby-app`'s "Family Fit Profiles" UI copy/routes or this
app's own product-strategy language were updated to match**), and photo
upload added for `PersonProfile`. Also renamed package identity from
`happy-baby` to `happy-shopping`, alongside returns-protection and
tryon-service. 🚨 **Its Railway URL
(`https://happy-baby-fit-engine-production.up.railway.app`, project
`amused-wisdom`, shared with returns-protection) returned "Application not
found" when hit directly on 2026-09-06** — see the banner at the top of
this file; not yet fixed. The earlier `node dist/index.js` production crash
fix (switched from the `prisma-client` generator to `prisma-client-js`) is
presumed still in the code but couldn't be re-confirmed live given the
outage. Previously verified live with real HTTP requests against the real
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

**Committed, pushed to GitHub.** Package identity renamed from `happy-baby`
to `happy-shopping`, alongside fit-engine and tryon-service — otherwise
functionally unchanged since the last sync. 🚨 **Its Railway URL
(`https://happy-baby-returns-protection-production.up.railway.app`, project
`amused-wisdom`, shared with fit-engine) returned "Application not found"
when hit directly on 2026-09-06** — see the banner at the top of this file;
not yet fixed. The `node dist/index.js` production crash fix (same
`prisma-client-js` switch as fit-engine) is presumed still in the code but
couldn't be re-confirmed live given the outage. Previously verified live
end-to-end against the real shared Supabase database:

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

- `POST /api/try-on` (multipart `personImage` + `garmentImage`, or
  `upperGarmentImage` + `lowerGarmentImage` for outfit mode) → forwards to
  the active provider adapter, returns `{ imageUrl }`. `HuggingFaceProvider`
  talks to a Gradio Space (not a REST endpoint — free HF Spaces don't have
  one) via `@gradio/client`, configured with `HUGGINGFACE_SPACE` (not
  `HUGGINGFACE_ENDPOINT_URL`, the old, wrong design), defaulting to
  `yisol/IDM-VTON` — **but throws an explicit error for outfit requests**
  ("outfit (upper + lower) requests need PROVIDER=self-hosted"). `GET
  /health` → `{ status, provider }`.
- **`SelfHostedProvider` is no longer a stub** (confirmed by reading
  `src/providers/selfHosted.ts` directly) — it now calls a real
  **RunPod-hosted CatVTON FastAPI server** via `SELF_HOSTED_ENDPOINT_URL`
  (no default; must point at a real running server), supports outfit mode,
  and detects CatVTON's own NSFW-classifier false-positives by SHA-256
  hash-matching its response bytes against a known static placeholder image
  (the classifier returns a normal 200 with no error field when it
  false-positives, so there's no other signal to detect it by).
- **Package identity renamed from `happy-baby` to `happy-shopping`.**
- Default `PROVIDER` env var is still `huggingface` — confirming whether
  Railway's `PROVIDER` is actually set to `self-hosted` (required for the
  outfit try-on feature `happy-baby`/`happy-baby-app` already ship) was not
  possible this pass; see below.
- 🚨 **This service's Railway URL
  (`https://happy-baby-tryon-service-production.up.railway.app`) returned
  "Application not found" when hit directly on 2026-09-06** — the live
  deployment appears to be gone or renamed, likely related to the package
  rename above touching the Railway service itself. Not yet fixed. See the
  banner at the top of this file.
- No `railway.json`/`Procfile`/`nixpacks.toml` is committed anywhere — the
  (now-unreachable) deployment's build/start commands, domain, and env vars
  (`HUGGINGFACE_API_KEY`, `HUGGINGFACE_SPACE`, `SELF_HOSTED_ENDPOINT_URL`,
  `ALLOWED_ORIGINS`, `PORT`, `PROVIDER`) only ever existed in Railway's
  dashboard, not as version-controlled config — this makes diagnosing/
  redeploying after the outage above harder than it needed to be.
- **Still has no authentication on `POST /api/try-on`** — confirmed again by
  reading `src/middleware/` (only `errorHandler.ts` exists, no JWT check
  anywhere). This has been the single most-repeated open item across every
  sync of this file for weeks; still not fixed. Once real, real-money
  RunPod/Hugging Face inference is running again post-outage, every
  unauthenticated caller can trigger it.

---

## Immediate next steps

1. 🚨 **Diagnose and fix the Railway outage** — check the Railway dashboard
   for fit-engine's, returns-protection's, and tryon-service's actual
   current service URLs, then re-point `TRYON_SERVICE_URL`/
   `RETURNS_SERVICE_URL` (this repo's Vercel env vars) and
   `happy-baby-app`'s hardcoded `FIT_ENGINE_URL`/`RETURNS_SERVICE_URL`
   constants at whatever the real URLs turn out to be. This is now the
   single biggest blocker across the whole platform.
2. **Confirm `PROVIDER=self-hosted` is actually set on tryon-service**
   once it's reachable again — otherwise every outfit try-on request (a
   feature already shipped in both this repo and the mobile app) fails
   outright against the default `huggingface` provider, which explicitly
   rejects outfit requests.
3. **Add JWT auth to `happy-baby-tryon-service`'s `POST /api/try-on`** —
   still the clearest concrete open security item, unaddressed for weeks.
   Should verify the same Bearer JWT this app already issues, consistent
   with fit-engine and returns-protection.
4. Confirm whether fit-engine's `FamilyProfile`→`PersonProfile` rename
   needs any corresponding update in this repo or `happy-baby-app` (UI
   copy, route names) — not checked this pass.
5. Decide whether/how this app's product catalog should expose real
   per-product size charts for fit-engine to consume — fit-engine's
   `/api/fit-score` still requires the caller to pass one in, and the
   mobile app currently works around this with a generic per-vertical
   chart rather than real product data.
6. returns-protection: decide whether return-case status should
   auto-transition based on proof completeness, or stay fully manual.
7. Consider removing the now-vestigial `FAL_API_KEY`/`HF_TOKEN` Vercel env
   vars on this project — nothing in `app/` or `lib/` references them
   anymore now that `/api/try-on` just proxies to `TRYON_SERVICE_URL`.
8. Consider committing IaC/deploy config for all three Railway services
   (build/start commands, domain, env var names) — none of it is
   version-controlled today, which made the outage above harder to
   diagnose and will make it harder to reproduce a fix.
9. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell so the nested-repo trap described above doesn't cause confusion
   later (not touched yet — flagging only, across all repos).
