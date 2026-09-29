import type { Want } from "./types";

/**
 * Does a want match what a seller sells? Returns the keyword that hit, if any.
 * Keywords are matched against the card name and set; local-preferred wants
 * only match sellers in the buyer's state. Used by alerts and the Selling view.
 */
export function matchInterest(
  want: Pick<Want, "cardName" | "setName" | "scope" | "state">,
  seller: { interests: string[]; state: string },
): string | undefined {
  if (want.scope === "local" && seller.state !== want.state) return undefined;
  const haystack = `${want.cardName} ${want.setName}`.toLowerCase();
  return seller.interests.find((k) => haystack.includes(k.toLowerCase()));
}
