@AGENTS.md

# Stadium — project context

Buyer-first marketplace for Pokémon cards (a reverse auction). Buyers post a "want"; sellers reply with offers that are **fully public**, so sellers undercut each other and buyers hold the power. Goal: cut down on scalping. Product spec: `Stevens Good Ideas.pdf` in the repo root (read it for the full design).

## Guiding star (check every decision against this)

**Put the power back in the hands of consumers — not the big stores, not the scalpers — so people who love Pokémon can buy and sell the cards they have at the best value possible.**

Proposed implications (confirm with Adam before treating any as final):
- Offers rank on price (and later, honest reputation) only. No paid placement or featured offers, since that lets whoever pays most buy visibility.
- Fees stay low, flat and shown up front. Don't charge buyers to post wants.
- Help people know what's fair: show market price, and how far each offer sits above or below it.
- Shops are welcome but play by the same rules as individual collectors. No perks for size.
- Transparency is the anti-scalper tool: public offers, public price history, public record of how buyers and sellers follow through.

## Commands

- `npm run dev` → http://localhost:3000
- `npm run build`, `npm run lint`, `npx tsc --noEmit`
- Reset demo data: stop the dev server, delete `data/pglite` (re-migrates and re-seeds from `src/lib/seed.ts` on next request)
- After editing `src/db/schema.ts`: `npm run db:generate` (writes a migration to `drizzle/`; commit it — the app applies migrations on startup)
- Env: copy `.env.example` → `.env.local` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, optional `DATABASE_URL`)

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4. **Read `node_modules/next/dist/docs/` before using Next APIs** — `params`, `searchParams` and `cookies()` are async; use the generated `PageProps<"/route">`, `LayoutProps`, `RouteContext` types (run `npx next typegen` after adding routes).
- Mutations are server actions in `src/app/actions.ts` + `revalidatePath`. Forms use `useActionState`.
- Fonts come from the `geist` npm package (not `next/font/google`).
- **Postgres for data, Better Auth for sign-up, Stripe Connect for anything involving money or seller identity** (payouts, verification, checkout). Don't introduce other providers for these without asking.

## Architecture (base version — intentionally swappable)

| Concern | Current | Swap point |
| --- | --- | --- |
| Data | Postgres via Drizzle (`src/db/schema.ts`, migrations in `drizzle/`). No `DATABASE_URL` → PGlite (in-process Postgres in `data/pglite`, git-ignored). Always `await dbReady()` (or `getCurrentUser`/`expireWants`, which do) before querying | `src/lib/db.ts` |
| Auth | Better Auth, email + password, Drizzle adapter on the same Postgres. `user` has extra `city`/`state` fields. Server actions call `auth.api.*`; the `nextCookies()` plugin sets cookies | `src/lib/auth.ts`, `src/lib/session.ts` (`getCurrentUser` → `User | null`, `requireUser(next)`) |
| Money / seller identity | Stripe Connect — **not wired up yet**. `seller_profile.stripe_account_id` is reserved for it | — |
| Photos | **Disabled.** User uploads were removed until accounts have some verification; only official TCGdex images are shown. The old local-disk upload code is in git history. | → S3/R2/Vercel Blob when re-enabled |
| Card data | TCGdex API (free, no key), cached via `fetch` `next.revalidate` | `src/lib/tcgdex.ts`; `TCGDEX_API_URL` env overrides base URL |

Data model: tables in `src/db/schema.ts`, types derived in `src/lib/types.ts`. `User` = Better Auth user + `seller: SellerProfile | null`. **Every account is a buyer; a seller is a buyer with a `seller_profile` row** (individual or company with `businessName`, alert `interests` keywords). `Want`, `Offer`, `Alert`. Timestamps are `timestamptz` → `Date`.

## Domain rules implemented

- Visitors (signed out) can browse, search and read posts. Any interaction is wrapped in `<SignUpGate>`, which opens the "Sign up today. It's free." modal instead. Pages that need an account use `requireUser(path)` (redirects to `/signup?next=`).
- Sign-up: `/signup` (collector account: name, email, password, city, state) → `/signup/welcome` ("You are all set up to start buying as a collector!" + opt in/out of selling) → optional `/seller/setup?onboarding=1`. Opting out is fine; "Start selling" in the account menu opens `/seller/setup` later.
- Buying / Selling toggle (header, only for users with a seller profile; `stadium_view` cookie, read via `getViewMode` in `src/lib/view-mode.ts`). Selling view adds "Buyers looking for cards you sell" above All posts on `/`: open posts from others matching the seller's keywords (`matchInterest` in `src/lib/matching.ts`, same rule as alerts).
- Recently viewed panel (`src/components/RecentHistory.tsx`): last 20 posts opened, per account per browser (ids in localStorage `stadium:recent:<userId|visitor>`, details from `GET /api/wants/summary?ids=`). Docks left/right/bottom at 20% of the viewport like dev tools; the page (`.history-shell`) gets padding so nothing is covered; phones always dock bottom. Open/closed + dock side in the `stadium_history` cookie so the server renders the right layout. Post pages record views with `<RecordView wantId>`.
- Best offer: ranked by `rankOffers` (`src/lib/format.ts`: delivered total, then earliest). Green glow (`.best-offer`) for everyone; gold (`.best-offer-mine`, `--gold` tokens) when it's the viewer's own offer, also called out in the offer form, the Selling view and the history panel (`mineIsBest` from `/api/wants/summary`).
- Demo data: `src/lib/seed.ts` (users, the original 3 posts) + `src/lib/seed-posts.ts` (30 more posts with real TCGdex card data). Seeding is idempotent (fixed ids, `onConflictDoNothing`) and tops up on every dev start; bump `SEED_VERSION` after adding demo data.
- Header tabs (`NavLink`, highlights the current page): **My wants** (`/my/wants`, every signed-in user: their posts grouped Pending / Open / Closed with what to do next) and **My offers** (`/my/offers`, seller profile only: current offers grouped Accepted & won / Active / Closed, with leading (gold) / outbid rank). The browse page no longer has a "My posts" filter.
- Posting wants needs an account; offers need a seller profile; sellers can't offer on their own post.
- Test tools bar (dev, or `STADIUM_TEST_TOOLS=1`): "Test sign up" (sign out → `/signup`) and a "Viewing as" demo account switcher. Demo accounts share the password in `src/lib/seed.ts`.

- Post states: `open` (Open — looking) → `pending` (buyer accepted an offer) → `sold` or `no_deal`. Buyer can reopen a pending post or close with no deal. Open posts past `expiresAt` auto-close as `no_deal` (`closedReason: "expired"`).
- Buyers choose local-preferred or nationwide per post, and how long it stays public (1–7 days).
- Offers: price + shipping (or local meetup). Ranked by delivered total; lowest is flagged. A seller's new offer supersedes their old one, but superseded offers stay public under "Earlier offers."
- No new offers while pending.
- Seller alerts: keyword match on card name + set; local-preferred wants only alert sellers in the buyer's state. In-app only (`/alerts`).
- Payment is off-platform for now; buyer marks the post sold. On-platform payment will use Stripe Connect.
- TCGdex: search skips TCG Pocket (digital, `/tcgp/` image paths) and image-less cards. Card image URL + `/low.webp` or `/high.webp`. Market price = first TCGplayer variant with `marketPrice` (USD, ungraded). `createWant` re-fetches the picked card server-side rather than trusting the client.
- Card images use `ZoomImage` (`src/components/ZoomImage.tsx`): after a 300ms mouse hover, a round lens magnifies the high-res image under the cursor. Use it for any new card image.

## Open questions from the spec (still undecided — ask Adam before locking in)

Alert channels (email/push/SMS) and how sellers define alert criteria; how "local preferred" affects ranking vs. alerts; whether Pending can revert automatically if a deal stalls; on-platform checkout/buyer protection vs. direct payment; buyer accountability (ratings, no-deal record); trust (required photos, graded-only, counterfeit checks); company seller verification and team members; revenue model (seller fee, subscriptions, featured offers).

## Suggested next steps

1. Stripe Connect seller onboarding (identity verification + payouts).
2. Email verification and password reset (Better Auth + an email provider).
3. Re-enable user photos (cloud storage) once accounts are verified.
4. Email alerts for sellers.
5. Reputation for buyers and sellers.
