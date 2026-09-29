import type { CardCondition, Offer, User, WantStatus } from "./types";

export const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });

export const conditionLabel = (c: CardCondition) =>
  c.kind === "raw" ? `Raw · ${c.condition}` : `${c.company} ${c.grade}`;

export const displayName = (u?: User) =>
  !u ? "Unknown" : u.sellerType === "company" && u.businessName ? u.businessName : u.name;

export const offerTotal = (o: Offer) => o.price + o.shipping;

export const STATUS_LABEL: Record<WantStatus, string> = {
  open: "Open — looking",
  pending: "Pending",
  sold: "Closed — sold",
  no_deal: "Closed — no deal",
};

export function timeAgo(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function timeLeft(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  if (diff <= 0) return "ended";
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.round(diff / 60_000))}m left`;
  if (h < 48) return `${h}h left`;
  return `${Math.round(h / 24)}d left`;
}
