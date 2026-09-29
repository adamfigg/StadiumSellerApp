# Stadium

A buyer-first marketplace for Pokémon cards. Buyers post what they want, and sellers compete with fully public offers — a reverse auction that pushes prices down instead of up.

Design doc: `Stevens Good Ideas.pdf`.

## Tech stack

| Concern | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Data | **Postgres** via Drizzle ORM. Local dev runs [PGlite](https://pglite.dev) (Postgres in WASM, in-process) when `DATABASE_URL` is unset |
| Accounts | **Better Auth** (email + password), stored in the same Postgres |
| Money and seller identity | **Stripe Connect**, for payouts, seller verification and anything else involving money. Not wired up yet |
| Card data | [TCGdex](https://tcgdex.dev), a free API with no key |

## Run it

```bash
npm install
cp .env.example .env.local   # then set BETTER_AUTH_SECRET
npm run dev
```

Open http://localhost:3000. With no `DATABASE_URL`, the app creates a local Postgres (PGlite) in `data/pglite`, applies the migrations in `drizzle/` and seeds demo data on first request. To reset, stop the dev server and delete `data/pglite`.

To use a real Postgres server (Neon, Supabase, RDS, a local install), set `DATABASE_URL`. Migrations run automatically on first request.

After changing `src/db/schema.ts`, run `npm run db:generate` to write a new migration, and commit it.

Card search, official card images, set names, numbers, rarity and TCGplayer market prices come from TCGdex. Calls go through `src/lib/tcgdex.ts` and are cached by Next. Set `TCGDEX_API_URL` to point somewhere else.

### Test tools

In `npm run dev` (or any build with `STADIUM_TEST_TOOLS=1`), a yellow **Test tools** bar sits above the header:

- **Test sign up** signs you out and opens the sign-up flow as a brand-new visitor.
- **Viewing as** signs you in as a seeded demo account (Maya, Jordan, Priya and Marcus have no seller profile; Card Vault SLC, Eli, Top Deck, Hana and Lone Star Cards do), or signs you out. Every demo account uses the password `stadium-demo` (set in `src/lib/seed.ts`).

## Accounts

- **Visitors** (signed out) can browse, search and read every post and offer. Trying to do anything else (post a want, make an offer) opens a "Sign up today. It's free." modal.
- **Every account is a buyer.** Sign-up collects what a buyer needs to post a want: name, email, password, city and state.
- **Sellers are buyers who opted in.** Right after sign-up: "You are all set up to start buying as a collector! Are you interested in setting up your seller profile details as well?" Say yes to add a seller profile (individual or shop, business name, alert keywords), or skip and do it later from the account menu (**Start selling**).

### Buying and Selling views

Users with a seller profile get a **Buying / Selling** toggle in the header. Buying shows the normal browse page. Selling adds a **Buyers looking for cards you sell** section at the top: open posts from other people that match your seller keywords, with what it takes to win each one. The full post list is still below it. Users without a seller profile always see the Buying view.

### Recently viewed

A **History** button in the header shows or hides a **Recently viewed** panel: the last 20 posts you opened, with the card image, name, status, budget and lowest offer (always current). Like browser dev tools, the buttons at the top of the panel dock it to the left, right or bottom, where it takes 20% of the screen and the page shrinks to make room. On phones it always sits at the bottom. The list is kept in your browser, per account.

## Screens

| Screen | Route | Who |
| --- | --- | --- |
| Browse wants (open / pending / closed, search) | `/` | everyone |
| My wants: all your posts, grouped Pending / Open / Closed, with offers to review | `/my/wants` | signed in |
| My offers: every offer you've made, whether you're leading (gold), outbid, accepted or won | `/my/offers` | sellers |
| Sign up (step 1: collector account) | `/signup` | visitors |
| Welcome and opt in to selling | `/signup/welcome` | new accounts |
| Seller profile (step 2 of sign-up, or later) | `/seller/setup` | signed in |
| Sign in | `/signin` | visitors |
| Post a want: search TCGdex to pick the exact card (fills name, set, number, official image, market price), or type it in; card, set, number, raw condition or grade, price range, local-preferred or nationwide, how long it stays public | `/wants/new` | signed in |
| Want page with the public offer thread, ranked by delivered price | `/wants/[id]` | everyone |
| Make or revise an offer (price, ship or local meetup, shipping, note) | `/wants/[id]` | sellers |
| Accept an offer → Pending → Mark sold / Reopen / Close with no deal | `/wants/[id]` | the post's buyer |
| Alerts for matching wants, and the keywords that trigger them | `/alerts` | sellers |

Post states follow the design doc: **Open — looking**, **Pending**, **Closed — sold**, **Closed — no deal**. An open post that reaches its time limit closes as no deal.

## Where things live

```
drizzle/                  SQL migrations (generated; applied on startup)
src/
  db/schema.ts            Postgres tables: Better Auth (user, session, account, verification)
                          + seller_profile, want, offer, alert
  app/
    actions.ts            server actions for every mutation (sign-up, post, offer, accept, sold…)
    api/auth/[...all]/    Better Auth HTTP handler
    page.tsx              browse feed
    signup/, signin/      sign-up flow and sign-in
    seller/setup/         seller profile
    wants/new/page.tsx    post a want
    wants/[id]/page.tsx   want + public offer thread
    alerts/page.tsx       seller alerts + keyword settings
  components/             forms, sign-up modal (SignUpGate), test tools bar, card art, zoom lens
  lib/
    db.ts                 Drizzle connection (Postgres or PGlite), migrations, expiry
    auth.ts               Better Auth config
    session.ts            getCurrentUser / requireUser
    seed.ts               demo data and demo accounts
    types.ts              domain types (derived from the schema)
    format.ts             money, labels, relative times
    tcgdex.ts             TCGdex card search + details
```

## Placeholder answers to the doc's open questions

These are the defaults the base version uses. Each one is easy to change.

- **Alerts:** sellers list keywords; a want alerts them when its card name or set contains one. Local-preferred wants only alert sellers in the buyer's state. In-app only for now (no email, push or SMS).
- **Pending:** no new offers while pending; the buyer can reopen to offers.
- **Revising:** a seller's new offer replaces their old one, but the old one stays visible under "Earlier offers" so the price history is public.
- **Payment:** off-platform for now. The buyer marks the post sold. On-platform payments will go through Stripe Connect.
- **Ranking:** offers sort by price plus shipping.

## Next steps

1. Stripe Connect onboarding for sellers (identity verification and payouts), stored on `seller_profile.stripe_account_id`.
2. Email verification and password reset (Better Auth hooks plus an email provider).
3. Bring back user photo uploads (S3, R2 or Vercel Blob) once accounts have verification. Uploads are turned off for now.
4. Email alerts for sellers.
5. Buyer and seller reputation (ratings, record of no-deal closes).
