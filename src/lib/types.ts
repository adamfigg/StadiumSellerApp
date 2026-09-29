import type * as schema from "@/db/schema";

export type SellerType = "individual" | "company";

export type SellerProfile = typeof schema.sellerProfile.$inferSelect;

/** Every signed-in account can buy. `seller` is set once they opt in to selling. */
export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  state: string;
  seller: SellerProfile | null;
}

export const RAW_CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

export const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC", "TAG"] as const;

export type CardCondition =
  | { kind: "raw"; condition: (typeof RAW_CONDITIONS)[number] }
  | { kind: "graded"; company: (typeof GRADING_COMPANIES)[number]; grade: string };

/** open = accepting offers, pending = buyer picked an offer, sold / no_deal = closed. */
export type WantStatus = "open" | "pending" | "sold" | "no_deal";

export type Scope = "local" | "nationwide";

export type Fulfillment = "ship" | "local";

export type Want = typeof schema.want.$inferSelect;
export type Offer = typeof schema.offer.$inferSelect;
export type Alert = typeof schema.alert.$inferSelect;
