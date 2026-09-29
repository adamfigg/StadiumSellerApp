import type { CardCondition, Offer, SellerProfile, WantStatus } from "./types";

export const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });

export const conditionLabel = (c: CardCondition) =>
  c.kind === "raw" ? `Raw · ${c.condition}` : `${c.company} ${c.grade}`;

/** A company seller's business name, otherwise the person's name. */
export const displayName = (u?: { name: string; seller?: SellerProfile | null } | null) =>
  !u ? "Unknown" : u.seller?.sellerType === "company" && u.seller.businessName ? u.seller.businessName : u.name;

export const offerTotal = (o: Pick<Offer, "price" | "shipping">) => o.price + o.shipping;

/** Offer ranking everywhere: cheapest delivered total first; on a tie, whoever offered first. */
export const rankOffers = (a: Pick<Offer, "price" | "shipping" | "createdAt">, b: Pick<Offer, "price" | "shipping" | "createdAt">) =>
  offerTotal(a) - offerTotal(b) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

export const STATUS_LABEL: Record<WantStatus, string> = {
  open: "Open — looking",
  pending: "Pending",
  sold: "Closed — sold",
  no_deal: "Closed — no deal",
};

export function timeAgo(when: Date | string) {
  const diff = Date.now() - new Date(when).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function timeLeft(when: Date | string) {
  const diff = new Date(when).getTime() - Date.now();
  if (diff <= 0) return "ended";
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.round(diff / 60_000))}m left`;
  if (h < 48) return `${h}h left`;
  return `${Math.round(h / 24)}d left`;
}
