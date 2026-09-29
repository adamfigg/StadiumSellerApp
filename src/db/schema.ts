import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { CardCondition } from "@/lib/types";

const tz = { withTimezone: true } as const;

/* ---------- Better Auth tables (names and fields match Better Auth's core schema) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  // Extra sign-up fields (see `user.additionalFields` in lib/auth.ts). Every account is a buyer,
  // and a buyer's location drives local-preferred posts.
  city: text("city").notNull(),
  state: text("state").notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", tz).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", tz),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", tz),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", tz).notNull(),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

/* ---------- Stadium tables ---------- */

/** Present only for users who opted in to selling. All sellers are buyers; not all buyers are sellers. */
export const sellerProfile = pgTable("seller_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sellerType: text("seller_type", { enum: ["individual", "company"] }).notNull(),
  /** Shown instead of the person's name on offers when the seller is a company. */
  businessName: text("business_name"),
  /** Alert keywords, matched against a want's card name and set. */
  interests: text("interests").array().notNull().default([]),
  /** Stripe Connect account, once payouts / identity verification are wired up. */
  stripeAccountId: text("stripe_account_id"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const want = pgTable(
  "want",
  {
    id: text("id").primaryKey(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardName: text("card_name").notNull(),
    setName: text("set_name").notNull(),
    cardNumber: text("card_number"),
    description: text("description").notNull().default(""),
    tcgCardId: text("tcg_card_id"),
    officialImage: text("official_image"),
    rarity: text("rarity"),
    marketPrice: doublePrecision("market_price"),
    condition: jsonb("condition").$type<CardCondition>().notNull(),
    priceMin: doublePrecision("price_min").notNull(),
    priceMax: doublePrecision("price_max").notNull(),
    scope: text("scope", { enum: ["local", "nationwide"] }).notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    status: text("status", { enum: ["open", "pending", "sold", "no_deal"] }).notNull().default("open"),
    acceptedOfferId: text("accepted_offer_id"),
    closedReason: text("closed_reason", { enum: ["sold", "buyer_closed", "expired"] }),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", tz).notNull(),
    closedAt: timestamp("closed_at", tz),
  },
  (t) => [index("want_status_idx").on(t.status), index("want_buyer_idx").on(t.buyerId)],
);

export const offer = pgTable(
  "offer",
  {
    id: text("id").primaryKey(),
    wantId: text("want_id")
      .notNull()
      .references(() => want.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    price: doublePrecision("price").notNull(),
    shipping: doublePrecision("shipping").notNull().default(0),
    fulfillment: text("fulfillment", { enum: ["ship", "local"] }).notNull(),
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    /** Set when the seller posts a newer offer on the same want. Old offers stay public. */
    supersededAt: timestamp("superseded_at", tz),
  },
  (t) => [index("offer_want_idx").on(t.wantId)],
);

export const alert = pgTable(
  "alert",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wantId: text("want_id")
      .notNull()
      .references(() => want.id, { onDelete: "cascade" }),
    matchedOn: text("matched_on").notNull(),
    createdAt: timestamp("created_at", tz).notNull().defaultNow(),
    read: boolean("read").notNull().default(false),
  },
  (t) => [index("alert_seller_idx").on(t.sellerId)],
);
