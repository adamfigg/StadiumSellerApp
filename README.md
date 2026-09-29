# Stadium

A buyer-first marketplace for Pokémon cards. Buyers post what they want, and sellers compete with fully public offers — a reverse auction that pushes prices down instead of up.

Design doc: `Stevens Good Ideas.pdf`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Demo data is seeded on first run into `data/db.json` (git-ignored). Delete the `data` folder to reset.

Card search, official card images, set names, numbers, rarity and TCGplayer market prices come from [TCGdex](https://tcgdex.dev), a free API with no key. Calls go through `src/lib/tcgdex.ts` and are cached by Next. Set `TCGDEX_API_URL` to point somewhere else.

Use the **Viewing as** menu in the header to switch between demo buyers and sellers. It stands in for real accounts.

## What's in the base version

| Screen | Route | Who |
| --- | --- | --- |
| Browse wants (open / pending / closed, search, my posts) | `/` | everyone |
| Post a want: search TCGdex to pick the exact card (fills name, set, number, official image, market price), or type it in; card, set, number, raw condition or grade, price range, photo, local-preferred or nationwide, how long it stays public | `/wants/new` | buyers |
| Want page with the public offer thread, ranked by delivered price | `/wants/[id]` | everyone |
| Make or revise an offer (price, ship or local meetup, shipping, note) | `/wants/[id]` | sellers |
| Accept an offer → Pending → Mark sold / Reopen / Close with no deal | `/wants/[id]` | the post's buyer |
| Alerts for matching wants, and the keywords that trigger them | `/alerts` | sellers |

Post states follow the design doc: **Open — looking**, **Pending**, **Closed — sold**, **Closed — no deal**. An open post that reaches its time limit closes as no deal.

## Where things live

```
src/
  app/
    actions.ts            server actions for every mutation (post, offer, accept, sold…)
    page.tsx              browse feed
    wants/new/page.tsx    post a want
    wants/[id]/page.tsx   want + public offer thread
    alerts/page.tsx       seller alerts + keyword settings
    api/uploads/[file]/   serves uploaded card photos
  components/             forms, badges, card art, account switcher
  lib/
    types.ts              data model (User, Want, Offer, Alert)
    db.ts                 JSON-file store: swap for Postgres here
    seed.ts               demo data
    session.ts            demo "current user" cookie: swap for real auth here
    format.ts             money, labels, relative times
    tcgdex.ts             TCGdex card search + details
```

## Placeholder answers to the doc's open questions

These are the defaults the base version uses. Each one is easy to change.

- **Alerts:** sellers list keywords; a want alerts them when its card name or set contains one. Local-preferred wants only alert sellers in the buyer's state. In-app only for now (no email, push or SMS).
- **Pending:** no new offers while pending; the buyer can reopen to offers.
- **Revising:** a seller's new offer replaces their old one, but the old one stays visible under "Earlier offers" so the price history is public.
- **Payment:** off-platform. The buyer marks the post sold.
- **Ranking:** offers sort by price plus shipping.

## Next steps

1. Real auth (Auth.js or Clerk) with buyer/seller account types and company profiles.
2. Postgres (Neon or Supabase) with Prisma or Drizzle behind `lib/db.ts`.
3. Photo storage (S3, R2 or Vercel Blob) instead of the local `data/uploads` folder.
4. Email alerts for sellers.
5. Buyer and seller reputation (ratings, record of no-deal closes).
