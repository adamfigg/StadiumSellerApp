@AGENTS.md

# Stadium — project context

Buyer-first marketplace for Pokémon cards (a reverse auction). Buyers post a "want"; sellers reply with offers that are **fully public**, so sellers undercut each other and buyers hold the power. Goal: cut down on scalping. Product spec: `Stevens Good Ideas.pdf` in the repo root (read it for the full design).

## Commands

- `npm run dev` → http://localhost:3000
- `npm run build`, `npm run lint`, `npx tsc --noEmit`
- Reset demo data: delete the `data/` folder (re-seeds from `src/lib/seed.ts` on next request)

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4. **Read `node_modules/next/dist/docs/` before using Next APIs** — `params`, `searchParams` and `cookies()` are async; use the generated `PageProps<"/route">`, `LayoutProps`, `RouteContext` types (run `npx next typegen` after adding routes).
- Mutations are server actions in `src/app/actions.ts` + `revalidatePath`. Forms use `useActionState`.
- Fonts come from the `geist` npm package (not `next/font/google`).

## Architecture (base version — intentionally swappable)

| Concern | Current | Swap point |
| --- | --- | --- |
| Data | JSON file `data/db.json` (git-ignored), serialized read/write queue | `src/lib/db.ts` (`readDb`, `mutateDb`) → Postgres + Prisma/Drizzle |
| Auth | "Viewing as" header dropdown sets `stadium_user` cookie | `src/lib/session.ts` (`getCurrentUser`) → Auth.js/Clerk |
| Photos | Saved to `data/uploads`, served by `/api/uploads/[file]` | → S3/R2/Vercel Blob |
| Card data | TCGdex API (free, no key), cached via `fetch` `next.revalidate` | `src/lib/tcgdex.ts`; `TCGDEX_API_URL` env overrides base URL |

Data model is in `src/lib/types.ts`: `User` (buyer | seller; sellers are individual or company with `businessName`, plus alert `interests` keywords), `Want`, `Offer`, `Alert`.

## Domain rules implemented

- Post states: `open` (Open — looking) → `pending` (buyer accepted an offer) → `sold` or `no_deal`. Buyer can reopen a pending post or close with no deal. Open posts past `expiresAt` auto-close as `no_deal` (`closedReason: "expired"`).
- Buyers choose local-preferred or nationwide per post, and how long it stays public (1–7 days).
- Offers: price + shipping (or local meetup). Ranked by delivered total; lowest is flagged. A seller's new offer supersedes their old one, but superseded offers stay public under "Earlier offers."
- No new offers while pending.
- Seller alerts: keyword match on card name + set; local-preferred wants only alert sellers in the buyer's state. In-app only (`/alerts`).
- Payment is off-platform; buyer marks the post sold.
- TCGdex: search skips TCG Pocket (digital, `/tcgp/` image paths) and image-less cards. Card image URL + `/low.webp` or `/high.webp`. Market price = first TCGplayer variant with `marketPrice` (USD, ungraded). `createWant` re-fetches the picked card server-side rather than trusting the client.

## Open questions from the spec (still undecided — ask Adam before locking in)

Alert channels (email/push/SMS) and how sellers define alert criteria; how "local preferred" affects ranking vs. alerts; whether Pending can revert automatically if a deal stalls; on-platform checkout/buyer protection vs. direct payment; buyer accountability (ratings, no-deal record); trust (required photos, graded-only, counterfeit checks); company seller verification and team members; revenue model (seller fee, subscriptions, featured offers).

## Suggested next steps

1. Real auth with buyer/seller sign-up and company profiles.
2. Postgres behind `lib/db.ts`.
3. Cloud photo storage.
4. Email alerts for sellers.
5. Reputation for buyers and sellers.
