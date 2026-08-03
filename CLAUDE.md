@AGENTS.md

# Happy Baby — Multi-Repo Project Context

Happy Baby is a multi-vertical e-commerce platform (Kids/Men/Women, branded
"Happy Baby"/"Happy Men"/"Happy Women") with a web app and mobile app sharing
one backend, plus three standalone microservices being built to eventually
sell as independent B2B products. This same file is kept in sync across all
five repos so any session has the full picture regardless of which repo it
starts in. Last updated 2026-08-02.

**You are here:** `happy-baby` — the Next.js web app + core backend, the
most mature and only currently-deployed repo. See its detailed section
below.

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

**Worth reconsidering given what the abandoned scaffold implies:** the
current tryon-service implementation has no authentication on
`POST /api/try-on`. The earlier scaffold's design (requiring the same JWT
this app issues) was reasoned about deliberately — try-on calls cost real
inference money — and that reasoning is still valid even though that
scaffold itself was abandoned. Adding JWT auth there, consistent with how
fit-engine and returns-protection already do it, may be worth doing before
it's ever deployed publicly.

## Repos

| # | Repo | Role | Status |
|---|------|------|--------|
| 1 | `happy-baby` | Next.js web app + core backend (Vercel, production) | Live, most mature |
| 2 | `happy-baby-app` (inner copy) | Expo React Native mobile app (SDK 54) | Built through checkout, untested on device |
| 3 | `happy-baby-fit-engine` | Standalone Express/TS API — Family Fit Profiles + Fit Confidence Score | Fully implemented (full CRUD + scoring, incl. age-based estimation for kids), uncommitted |
| 4 | `happy-baby-returns-protection` | Standalone Express/TS API — tamper-evident return proof | Fully implemented, verified live end-to-end, not deployed |
| 5 | `happy-baby-tryon-service` | Standalone Express/TS API — provider-agnostic try-on wrapper | Fully implemented, pushed to GitHub, not deployed, not yet wired into the app |

## Key product strategy — "Fit Certain"

Core differentiator: (1) enhanced virtual try-on, (2) Fit Confidence Score,
(3) Family Fit Profiles (unique multi-vertical family angle — no competitor
like Myntra/Ajio has this), (4) Proof-Locked Returns — targeting the two
biggest validated complaint themes in Indian fashion e-commerce reviews
(unfair return rejections, refund transparency). Long-term: package
fit-engine, returns-protection, and tryon-service as standalone B2B SaaS for
other e-commerce brands once proven inside Happy Baby.

## Cross-repo integration facts

- All three new microservices (fit-engine, returns-protection, tryon-service)
  are meant to be called *by* `happy-baby` (web) and `happy-baby-app`
  (mobile) eventually. **None of the three are wired into the main app yet**
  — they exist as standalone, independently-tested APIs only.
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
- **Try-on currently has two independent implementations** — not yet
  consolidated:
  - This app's own `/api/try-on` route, originally built against fal.ai
    then swapped to a free Hugging Face Space. This is what
    `happy-baby-app` actually calls today.
  - `happy-baby-tryon-service` is a new standalone, provider-agnostic
    replacement built separately — thin routing layer only, no AI logic,
    provider chosen via `PROVIDER` env var (`huggingface` implemented,
    `self-hosted` stubbed). Not yet wired into this app — migrating this
    app's `/api/try-on` callers over to it is still open.

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
  Architecture setup — mobile checkout uses a WebView loading Razorpay's
  Standard Checkout instead.
- In both fit-engine and returns-protection (not this repo), `node
  dist/index.js` currently fails at runtime — the generated Prisma client's
  ESM output doesn't load cleanly under plain `node`. They use `npm run dev`
  (`tsx`) for local running instead; not relevant to this repo's own Prisma
  setup, just noted here for context.

---

## Per-repo detail

### 1. happy-baby (this repo — web + core backend)

Next.js, deployed live on Vercel. Postgres via Supabase + Prisma. NextAuth
for web sessions, custom JWT endpoints (`/api/mobile-auth/login`, `/signup`,
`/me`) for the mobile app (JWT signing/verification in `lib/mobileJwt.ts` —
payload is exactly `{ sub, name, email }`, nothing else). Razorpay payments.
Anthropic-powered "Ask Happy Baby" assistant. Confirmed via git log (24
commits) and the API route listing under `app/api/`:

`addresses`, `assistant`, `auth/[...nextauth]`, `cart`, `cart/[productId]`,
`mobile-auth/login`, `mobile-auth/me`, `mobile-auth/signup`, `orders`,
`orders/[id]`, `products`, `products/[id]`, `razorpay/create-order`,
`signup`, `try-on`.

Not independently re-verified line-by-line beyond the commit log and route
listing — treat as accurate but not as deeply audited as the three
standalone services below (which had every endpoint exercised live).

### 2. happy-baby-app (mobile — use the **inner** `happy-baby-app\happy-baby-app\` copy)

Expo SDK 54. Confirmed via git log and file listing. Commit history:
`Initial commit` → `Day 12: Product detail screen with sticky Add to Cart
bar and related products` → `Day 13 complete: cart, product detail, shop
screen - verified on native device` → `Day 14: Mobile auth verified on
device` → `Add virtual try-on feature for clothing products` →
`Build out checkout: shipping address, order summary, Razorpay payment,
confirmation` (HEAD).

Screens present (`src/app/`): tabs home (`(tabs)/index.tsx`), shop by
vertical (`shop/[vertical].tsx`), product detail (`product/[id].tsx`), cart
tab, account tab, login/signup, checkout, razorpay-checkout (WebView),
order-confirmation, try-on (`try-on/[id].tsx`).

**Checkout was just built and is unverified on a real device** — that's the
immediate next step for this repo. Try-on is live with a known accepted bug:
garment type sometimes misclassified (e.g. jeans rendered as a shirt).

### 3. happy-baby-fit-engine

Express + TypeScript. Owns Family Fit Profiles and Fit Confidence Score.
Shares this app's Supabase database, isolated via `fit_`-prefixed tables
only (no separate Postgres schema — see "Cross-repo integration facts").

**Fully implemented and verified live** (real HTTP requests against the
real Supabase database, not just code review):

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
  **The caller must supply the product's `sizeChart` in the request** — no
  live integration with this app's product catalog exists yet. That's the
  main piece of wiring work if/when fit-engine gets integrated here.
  Nothing is persisted — stateless computation.

**Not yet committed** as of 2026-08-02.

### 4. happy-baby-returns-protection

Express + TypeScript. Handles tamper-evident return proof. Shares this
app's Supabase database, isolated via **both** `returns_`-prefixed tables
and its own Postgres schema (`returns_protection`).

**Fully implemented and verified live end-to-end**, including a full round
trip over real HTTP against the actual shared Supabase database:

- `POST /api/return-cases` (admin-only, creates a case linked to
  `orderId`/`itemId`), `GET /api/return-cases/:orderId` (admin-only, returns
  the case with packing + unboxing proof records together, chronologically
  ordered), `PATCH /api/return-cases/:id/status` (admin-only, walks through
  `proof_pending → proof_complete → dispute_open → resolved`, fully manual
  — no auto-transition on proof completeness).
- `POST /api/proof` — multipart upload to local disk (`uploads/`). Packing
  proof requires admin; unboxing proof just requires auth. `uploadedAt` is
  always server-set — verified a spoofed client timestamp is silently
  ignored. Records are immutable (no update/delete route).
  - **Known bug, not yet fixed:** the upload middleware writes the file to
    disk before the packing/admin check runs, so a rejected upload leaves
    an orphaned file with no matching database record.
- No deployment config exists yet; not wired into this app.

### 5. happy-baby-tryon-service

Express + TypeScript. Thin provider-agnostic wrapper — deliberately no AI
model logic, just routes to whichever provider `PROVIDER` selects.

- `POST /api/try-on` (multipart `personImage` + `garmentImage`) → forwards
  to the active provider adapter, returns `{ imageUrl }` or
  `{ imageBase64 }`. `HuggingFaceProvider` implemented against
  `HUGGINGFACE_ENDPOINT_URL`; `SelfHostedProvider` stubbed for a future GPU
  server. `GET /health`.
- Verified end-to-end (build, validation, CORS, and the full upload →
  provider → graceful-failure path).
- Pushed to `https://github.com/Sireesh441/happy-baby-tryon-service`. Not
  deployed, and not yet called by this app — this app's own `/api/try-on`
  (see "Cross-repo integration facts") is still what's actually in use.

---

## Immediate next steps

1. Test the mobile checkout flow end-to-end on a real device (still
   outstanding — `happy-baby-app` inner repo, HEAD commit).
2. fit-engine: commit the CRUD + age-estimation work (currently
   uncommitted). Then decide whether/how this app's product catalog should
   expose size charts for fit-engine to consume, instead of requiring the
   caller to pass one in.
3. returns-protection: fix the orphaned-file-on-rejected-upload bug in
   `POST /api/proof`. Decide whether return-case status should
   auto-transition based on proof completeness, or stay manual.
4. Both fit-engine and returns-protection: the `start`/`node dist/...`
   production run path currently crashes — needs a fix before either is
   actually deployed.
5. Deploy fit-engine, returns-protection, and tryon-service somewhere
   (currently all three run local-only, no deployment config in any of
   them).
6. Wire the three standalone services into this app and `happy-baby-app`
   as real integrations — in particular, decide whether to migrate off
   this app's built-in `/api/try-on` and onto `happy-baby-tryon-service`.
7. Consider cleaning up the outer, near-empty `happy-baby-app\` template
   shell so the nested-repo trap described above doesn't cause confusion
   later (not touched yet — flagging only).
