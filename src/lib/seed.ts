import { hashPassword } from "better-auth/crypto";
import * as s from "@/db/schema";
import type { Db } from "./db";
import { matchInterest } from "./matching";
import { DEMO_POSTS } from "./seed-posts";

/** Every demo account signs in with this password. Local demo data only. */
export const DEMO_PASSWORD = "stadium-demo";

/** Bump when adding demo data, so running dev servers top it up without a reset. */
export const SEED_VERSION = 2;

const hours = (h: number) => new Date(Date.now() + h * 3_600_000);

const users = [
  { id: "u_maya", name: "Maya Torres", email: "maya@demo.stadium.test", city: "Eagle Mountain", state: "UT" },
  { id: "u_jordan", name: "Jordan Lee", email: "jordan@demo.stadium.test", city: "Austin", state: "TX" },
  { id: "u_priya", name: "Priya Shah", email: "priya@demo.stadium.test", city: "Seattle", state: "WA" },
  { id: "u_marcus", name: "Marcus Green", email: "marcus@demo.stadium.test", city: "Chicago", state: "IL" },
  { id: "u_cardvault", name: "Sam Patel", email: "sam@demo.stadium.test", city: "Salt Lake City", state: "UT" },
  { id: "u_eli", name: "Eli Brooks", email: "eli@demo.stadium.test", city: "Denver", state: "CO" },
  { id: "u_topdeck", name: "Rae Kim", email: "rae@demo.stadium.test", city: "Phoenix", state: "AZ" },
  { id: "u_hana", name: "Hana Sato", email: "hana@demo.stadium.test", city: "San Diego", state: "CA" },
  { id: "u_dex", name: "Dex Rivera", email: "dex@demo.stadium.test", city: "Austin", state: "TX" },
];

const sellerProfiles: (typeof s.sellerProfile.$inferInsert)[] = [
  {
    userId: "u_cardvault",
    sellerType: "company",
    businessName: "Card Vault SLC",
    interests: ["charizard", "base set", "evolving skies", "umbreon"],
  },
  { userId: "u_eli", sellerType: "individual", interests: ["pikachu", "151", "umbreon"] },
  {
    userId: "u_topdeck",
    sellerType: "company",
    businessName: "Top Deck Collectibles",
    interests: ["charizard", "moonbreon", "crown zenith"],
  },
  { userId: "u_hana", sellerType: "individual", interests: ["151", "paldean fates", "iono", "pikachu"] },
  {
    userId: "u_dex",
    sellerType: "company",
    businessName: "Lone Star Cards",
    interests: ["base set", "neo genesis", "lugia", "crobat"],
  },
];

/**
 * Demo data. Safe to run repeatedly: every row has a fixed id and existing rows are left alone,
 * so new demo data shows up in an existing database while its state (accepted offers etc.) is kept.
 */
export async function seed(db: Db) {
  const password = await hashPassword(DEMO_PASSWORD);

  await db.transaction(async (tx) => {
    await tx
      .insert(s.user)
      .values(users.map((u) => ({ ...u, emailVerified: true })))
      .onConflictDoNothing();
    await tx
      .insert(s.account)
      .values(
        users.map((u) => ({ id: `acc_${u.id}`, accountId: u.id, providerId: "credential", userId: u.id, password })),
      )
      .onConflictDoNothing();
    await tx.insert(s.sellerProfile).values(sellerProfiles).onConflictDoNothing();

    await tx
      .insert(s.want)
      .values([
        {
          id: "w_umbreon",
          buyerId: "u_maya",
          cardName: "Umbreon VMAX",
          setName: "Evolving Skies",
          cardNumber: "215/203",
          tcgCardId: "swsh7-215",
          officialImage: "https://assets.tcgdex.net/en/swsh/swsh7/215",
          rarity: "Secret Rare",
          marketPrice: 2214.79,
          description:
            "Looking for a clean Moonbreon for my binder. Centering matters more to me than the slab label.",
          condition: { kind: "graded", company: "PSA", grade: "10" },
          priceMin: 3800,
          priceMax: 4500,
          scope: "nationwide",
          city: "Eagle Mountain",
          state: "UT",
          status: "open",
          createdAt: hours(-20),
          expiresAt: hours(52),
        },
        {
          id: "w_charizard",
          buyerId: "u_jordan",
          cardName: "Charizard",
          setName: "Base Set",
          cardNumber: "4/102",
          tcgCardId: "base1-4",
          officialImage: "https://assets.tcgdex.net/en/base/base1/4",
          rarity: "Rare",
          marketPrice: 944.53,
          description: "Raw copy, no creases. Happy to meet locally if you're in Austin.",
          condition: { kind: "raw", condition: "Lightly Played" },
          priceMin: 700,
          priceMax: 900,
          scope: "local",
          city: "Austin",
          state: "TX",
          status: "open",
          createdAt: hours(-6),
          expiresAt: hours(66),
        },
        {
          id: "w_pikachu",
          buyerId: "u_maya",
          cardName: "Pikachu",
          setName: "151",
          cardNumber: "173/165",
          tcgCardId: "sv03.5-173",
          officialImage: "https://assets.tcgdex.net/en/sv/sv03.5/173",
          rarity: "Illustration rare",
          marketPrice: 77.13,
          description: "For my kid's birthday. Near mint raw is perfect.",
          condition: { kind: "raw", condition: "Near Mint" },
          priceMin: 60,
          priceMax: 80,
          scope: "nationwide",
          city: "Eagle Mountain",
          state: "UT",
          status: "pending",
          acceptedOfferId: "o_pika_eli",
          createdAt: hours(-50),
          expiresAt: hours(22),
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(s.offer)
      .values([
        {
          id: "o_umb_cv",
          wantId: "w_umbreon",
          sellerId: "u_cardvault",
          price: 4450,
          shipping: 0,
          fulfillment: "local",
          message: "PSA 10, strong centering. Can meet at our shop in SLC.",
          createdAt: hours(-18),
          supersededAt: hours(-4),
        },
        {
          id: "o_umb_td",
          wantId: "w_umbreon",
          sellerId: "u_topdeck",
          price: 4300,
          shipping: 25,
          fulfillment: "ship",
          message: "Insured shipping, ships same day.",
          createdAt: hours(-9),
        },
        {
          id: "o_umb_cv2",
          wantId: "w_umbreon",
          sellerId: "u_cardvault",
          price: 4199,
          shipping: 0,
          fulfillment: "local",
          message: "Dropping to $4,199 for local pickup.",
          createdAt: hours(-4),
        },
        {
          id: "o_pika_eli",
          wantId: "w_pikachu",
          sellerId: "u_eli",
          price: 68,
          shipping: 5,
          fulfillment: "ship",
          message: "Pulled it myself, straight to sleeve and toploader.",
          createdAt: hours(-40),
        },
        {
          id: "o_pika_cv",
          wantId: "w_pikachu",
          sellerId: "u_cardvault",
          price: 74,
          shipping: 0,
          fulfillment: "local",
          message: "",
          createdAt: hours(-44),
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(s.alert)
      .values([
        { id: "a_1", sellerId: "u_cardvault", wantId: "w_charizard", matchedOn: "charizard", createdAt: hours(-6) },
        { id: "a_2", sellerId: "u_topdeck", wantId: "w_charizard", matchedOn: "charizard", createdAt: hours(-6) },
      ])
      .onConflictDoNothing();

    await seedDemoPosts(tx as unknown as Db);
  });
}

/** The bulk demo posts in seed-posts.ts, with their offers and the alerts they would have sent. */
async function seedDemoPosts(db: Db) {
  const where = new Map(users.map((u) => [u.id, u]));
  const wants: (typeof s.want.$inferInsert)[] = [];
  const offers: (typeof s.offer.$inferInsert)[] = [];
  const alerts: (typeof s.alert.$inferInsert)[] = [];

  for (const p of DEMO_POSTS) {
    const buyer = where.get(p.buyerId)!;
    const createdAt = hours(-p.posted);
    const expiresAt = hours(-p.posted + p.days * 24);
    const offerIds = (p.offers ?? []).map((_, i) => `o_${p.id.slice(2)}_${i + 1}`);

    wants.push({
      id: p.id,
      buyerId: p.buyerId,
      ...p.card,
      description: p.description ?? "",
      condition: p.condition,
      priceMin: p.budget[0],
      priceMax: p.budget[1],
      scope: p.scope ?? "nationwide",
      city: buyer.city,
      state: buyer.state,
      status: p.status ?? "open",
      acceptedOfferId: p.accepted !== undefined ? offerIds[p.accepted] : null,
      closedReason: p.closedReason ?? null,
      closedAt:
        p.closedReason === "expired" ? expiresAt : p.closedHoursAgo !== undefined ? hours(-p.closedHoursAgo) : null,
      createdAt,
      expiresAt,
    });

    (p.offers ?? []).forEach(([sellerId, price, shipping, hoursAgo, message], i) => {
      offers.push({
        id: offerIds[i],
        wantId: p.id,
        sellerId,
        price,
        shipping: shipping === "local" ? 0 : shipping,
        fulfillment: shipping === "local" ? "local" : "ship",
        message: message ?? "",
        createdAt: hours(-hoursAgo),
      });
    });

    for (const profile of sellerProfiles) {
      if (profile.userId === p.buyerId) continue;
      const hit = matchInterest(
        { cardName: p.card.cardName, setName: p.card.setName, scope: p.scope ?? "nationwide", state: buyer.state },
        { interests: profile.interests ?? [], state: where.get(profile.userId)!.state },
      );
      if (!hit) continue;
      alerts.push({
        id: `a_${p.id.slice(2)}_${profile.userId.slice(2)}`,
        sellerId: profile.userId,
        wantId: p.id,
        matchedOn: hit,
        createdAt,
        read: (p.offers ?? []).some(([sellerId]) => sellerId === profile.userId),
      });
    }
  }

  await db.insert(s.want).values(wants).onConflictDoNothing();
  if (offers.length) await db.insert(s.offer).values(offers).onConflictDoNothing();
  if (alerts.length) await db.insert(s.alert).values(alerts).onConflictDoNothing();
}

export const DEMO_USERS = users;
