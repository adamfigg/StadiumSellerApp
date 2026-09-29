export type Role = "buyer" | "seller";
export type SellerType = "individual" | "company";

export interface Location {
  city: string;
  state: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  sellerType?: SellerType;
  /** Shown instead of `name` on offers when the seller is a company. */
  businessName?: string;
  location: Location;
  /** Seller alert keywords, matched against a want's card name and set. */
  interests?: string[];
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

export interface Want {
  id: string;
  buyerId: string;
  cardName: string;
  setName: string;
  cardNumber?: string;
  description: string;
  /** Buyer's own uploaded photo. */
  imagePath?: string;
  /** Linked TCGdex card: official image base URL, rarity and raw market price at post time. */
  tcgCardId?: string;
  officialImage?: string;
  rarity?: string;
  marketPrice?: number;
  condition: CardCondition;
  priceMin: number;
  priceMax: number;
  scope: Scope;
  location: Location;
  status: WantStatus;
  acceptedOfferId?: string;
  closedReason?: "sold" | "buyer_closed" | "expired";
  createdAt: string;
  expiresAt: string;
  closedAt?: string;
}

export type Fulfillment = "ship" | "local";

export interface Offer {
  id: string;
  wantId: string;
  sellerId: string;
  price: number;
  shipping: number;
  fulfillment: Fulfillment;
  message: string;
  createdAt: string;
  /** Set when the seller posts a newer offer on the same want. Old offers stay public. */
  supersededAt?: string;
}

export interface Alert {
  id: string;
  sellerId: string;
  wantId: string;
  matchedOn: string;
  createdAt: string;
  read: boolean;
}

export interface Database {
  users: User[];
  wants: Want[];
  offers: Offer[];
  alerts: Alert[];
}
