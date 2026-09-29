import "server-only";
import { cookies } from "next/headers";
import type { User } from "./types";

export type ViewMode = "buying" | "selling";

export const VIEW_MODE_COOKIE = "stadium_view";

/** Buying or Selling view, from the header toggle. Users without a seller profile always buy. */
export async function getViewMode(user: User | null): Promise<ViewMode> {
  if (!user?.seller) return "buying";
  return (await cookies()).get(VIEW_MODE_COOKIE)?.value === "selling" ? "selling" : "buying";
}
