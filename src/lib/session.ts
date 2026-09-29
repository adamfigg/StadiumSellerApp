import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as s from "@/db/schema";
import { auth } from "./auth";
import { db, dbReady } from "./db";
import type { User } from "./types";

/** The signed-in user with their seller profile (if any), or null for visitors. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  await dbReady();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, city, state } = session.user;
  const [seller] = await db.select().from(s.sellerProfile).where(eq(s.sellerProfile.userId, id));
  return { id, name, email, city, state, seller: seller ?? null };
});

/** For pages that need an account: sends visitors to sign-up, then back here. */
export async function requireUser(next: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(next)}`);
  return user;
}

/** Test tools (demo account switcher, "Test sign up") show in dev, or when STADIUM_TEST_TOOLS=1. */
export const TEST_TOOLS = process.env.NODE_ENV !== "production" || process.env.STADIUM_TEST_TOOLS === "1";
