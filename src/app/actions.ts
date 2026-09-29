"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAPIError } from "better-auth/api";
import * as s from "@/db/schema";
import { auth } from "@/lib/auth";
import { db, dbReady, newId } from "@/lib/db";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/seed";
import { getCurrentUser, TEST_TOOLS } from "@/lib/session";
import { matchInterest } from "@/lib/matching";
import { safeNext } from "@/lib/safe-next";
import { VIEW_MODE_COOKIE, type ViewMode } from "@/lib/view-mode";
import { isUsState } from "@/lib/states";
import { getCard } from "@/lib/tcgdex";
import {
  GRADING_COMPANIES,
  RAW_CONDITIONS,
  type CardCondition,
  type SellerType,
  type Want,
} from "@/lib/types";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(str(fd, key));

const authError = (e: unknown, fallback: string) => ({ error: isAPIError(e) ? e.message : fallback });

/* ---------- Accounts ---------- */

/** Step 1 of sign-up: every account starts as a buyer. */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const city = str(formData, "city");
  const state = str(formData, "state");

  if (!name || !email) return { error: "Enter your name and email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!city || !isUsState(state)) return { error: "Enter your city and pick a state." };

  await dbReady();
  try {
    await auth.api.signUpEmail({ body: { name, email, password, city, state }, headers: await headers() });
  } catch (e) {
    return authError(e, "Couldn't create your account. Try again.");
  }
  revalidatePath("/", "layout");
  const next = safeNext(str(formData, "next"));
  redirect(next ? `/signup/welcome?next=${encodeURIComponent(next)}` : "/signup/welcome");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  await dbReady();
  try {
    await auth.api.signInEmail({
      body: { email: str(formData, "email").toLowerCase(), password: String(formData.get("password") ?? "") },
      headers: await headers(),
    });
  } catch (e) {
    return authError(e, "Couldn't sign you in. Try again.");
  }
  revalidatePath("/", "layout");
  redirect(safeNext(str(formData, "next")) ?? "/");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  revalidatePath("/", "layout");
  redirect("/");
}

/** Step 2 of sign-up (or later from the account menu): opt in to selling. */
export async function setupSeller(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };

  const sellerType: SellerType = str(formData, "sellerType") === "company" ? "company" : "individual";
  const businessName = str(formData, "businessName");
  if (sellerType === "company" && !businessName) return { error: "Enter your business name." };
  const interests = parseInterests(str(formData, "interests"));

  const values = {
    sellerType,
    businessName: sellerType === "company" ? businessName : null,
    interests,
  };
  await db
    .insert(s.sellerProfile)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: s.sellerProfile.userId, set: values });

  revalidatePath("/", "layout");
  redirect(safeNext(str(formData, "next")) ?? "/alerts");
}

/** Header Buying / Selling toggle. Selling view needs a seller profile. */
export async function setViewMode(formData: FormData) {
  const mode: ViewMode = str(formData, "mode") === "selling" ? "selling" : "buying";
  (await cookies()).set(VIEW_MODE_COOKIE, mode, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

/* ---------- Test tools (dev, or STADIUM_TEST_TOOLS=1) ---------- */

/** Header "Test sign up": sign out and start the new-visitor sign-up flow. */
export async function testSignUp() {
  if (!TEST_TOOLS) return;
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect("/signup");
}

/** Header demo switcher: sign in as a seeded account, or sign out for "Visitor". */
export async function demoSignIn(formData: FormData) {
  if (!TEST_TOOLS) return;
  await dbReady();
  const demo = DEMO_USERS.find((u) => u.id === str(formData, "userId"));
  const hdrs = await headers();
  if (demo) {
    await auth.api.signInEmail({ body: { email: demo.email, password: DEMO_PASSWORD }, headers: hdrs });
  } else {
    await auth.api.signOut({ headers: hdrs }).catch(() => undefined);
  }
  revalidatePath("/", "layout");
}

/* ---------- Buyer: post a want ---------- */

function parseInterests(raw: string) {
  const words = raw
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(words)];
}

/** Sends an alert to each seller whose interests match the new want. */
async function queueSellerAlerts(want: Want) {
  const sellers = await db
    .select({ userId: s.sellerProfile.userId, interests: s.sellerProfile.interests, state: s.user.state })
    .from(s.sellerProfile)
    .innerJoin(s.user, eq(s.user.id, s.sellerProfile.userId))
    .where(ne(s.sellerProfile.userId, want.buyerId));
  const alerts = sellers.flatMap((seller) => {
    const hit = matchInterest(want, seller);
    return hit ? [{ id: newId("a"), sellerId: seller.userId, wantId: want.id, matchedOn: hit }] : [];
  });
  if (alerts.length) await db.insert(s.alert).values(alerts);
}

export async function createWant(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign up or sign in to post a want." };

  const cardName = str(formData, "cardName");
  const setName = str(formData, "setName");
  const priceMin = num(formData, "priceMin");
  const priceMax = num(formData, "priceMax");
  const days = Math.min(7, Math.max(1, num(formData, "days") || 3));

  if (!cardName || !setName) return { error: "Card name and set are required." };
  if (!(priceMin >= 0) || !(priceMax > 0) || priceMin > priceMax)
    return { error: "Enter a valid price range (min can't be more than max)." };

  let condition: CardCondition;
  if (str(formData, "conditionKind") === "graded") {
    const company = str(formData, "company") as (typeof GRADING_COMPANIES)[number];
    const grade = str(formData, "grade");
    if (!GRADING_COMPANIES.includes(company) || !grade)
      return { error: "Pick a grading company and grade." };
    condition = { kind: "graded", company, grade };
  } else {
    const c = str(formData, "rawCondition") as (typeof RAW_CONDITIONS)[number];
    if (!RAW_CONDITIONS.includes(c)) return { error: "Pick a condition." };
    condition = { kind: "raw", condition: c };
  }

  // If the buyer picked a card from search, re-fetch it server-side for the official image and market price.
  const tcgCardId = str(formData, "tcgCardId");
  const card = tcgCardId ? await getCard(tcgCardId) : undefined;

  const now = new Date();
  const [want] = await db
    .insert(s.want)
    .values({
      id: newId("w"),
      buyerId: user.id,
      cardName,
      setName,
      cardNumber: str(formData, "cardNumber") || null,
      description: str(formData, "description"),
      tcgCardId: card?.id,
      officialImage: card?.image,
      rarity: card?.rarity,
      marketPrice: card?.marketPrice,
      condition,
      priceMin,
      priceMax,
      scope: str(formData, "scope") === "local" ? "local" : "nationwide",
      city: user.city,
      state: user.state,
      createdAt: now,
      expiresAt: new Date(now.getTime() + days * 86_400_000),
    })
    .returning();
  await queueSellerAlerts(want);

  revalidatePath("/");
  redirect(`/wants/${want.id}`);
}

/* ---------- Seller: make an offer ---------- */

export async function createOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign up or sign in to make an offer." };
  if (!user.seller) return { error: "Set up your seller profile to make offers." };

  const wantId = str(formData, "wantId");
  const price = num(formData, "price");
  const fulfillment = str(formData, "fulfillment") === "local" ? "local" : "ship";
  const shipping = fulfillment === "local" ? 0 : num(formData, "shipping") || 0;
  if (!(price > 0)) return { error: "Enter an offer price." };
  if (shipping < 0) return { error: "Shipping can't be negative." };

  const error = await db.transaction(async (tx) => {
    const [want] = await tx.select().from(s.want).where(eq(s.want.id, wantId)).for("update");
    if (!want) return "That post no longer exists.";
    if (want.buyerId === user.id) return "You can't make an offer on your own post.";
    if (want.status !== "open" || want.expiresAt <= new Date()) return "This post isn't taking offers right now.";
    const now = new Date();
    // A seller's newest offer replaces their previous one, but the old one stays public.
    await tx
      .update(s.offer)
      .set({ supersededAt: now })
      .where(and(eq(s.offer.wantId, wantId), eq(s.offer.sellerId, user.id), isNull(s.offer.supersededAt)));
    await tx.insert(s.offer).values({
      id: newId("o"),
      wantId,
      sellerId: user.id,
      price,
      shipping,
      fulfillment,
      message: str(formData, "message"),
      createdAt: now,
    });
    await tx
      .update(s.alert)
      .set({ read: true })
      .where(and(eq(s.alert.wantId, wantId), eq(s.alert.sellerId, user.id)));
  });
  if (error) return { error };

  revalidatePath(`/wants/${wantId}`);
  revalidatePath("/");
  return undefined;
}

/* ---------- Buyer: move a post through its states ---------- */

async function updateOwnWant(wantId: string, fn: (w: Want) => Partial<Want> | string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in first.");
  const error = await db.transaction(async (tx) => {
    const [want] = await tx.select().from(s.want).where(eq(s.want.id, wantId)).for("update");
    if (!want) return "Post not found.";
    if (want.buyerId !== user.id) return "Only the buyer can change this post.";
    const change = fn(want);
    if (typeof change === "string") return change;
    await tx.update(s.want).set(change).where(eq(s.want.id, wantId));
  });
  if (error) throw new Error(error);
  revalidatePath(`/wants/${wantId}`);
  revalidatePath("/");
}

export async function acceptOffer(formData: FormData) {
  const offerId = str(formData, "offerId");
  await updateOwnWant(str(formData, "wantId"), (w) =>
    w.status !== "open"
      ? "Offers can only be accepted while the post is open."
      : { status: "pending", acceptedOfferId: offerId },
  );
}

export async function markSold(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) =>
    w.status !== "pending"
      ? "Only pending posts can be marked sold."
      : { status: "sold", closedReason: "sold", closedAt: new Date() },
  );
}

export async function reopenWant(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) => {
    if (w.status !== "pending") return "Only pending posts can be reopened.";
    if (w.expiresAt <= new Date()) return "This post has expired.";
    return { status: "open", acceptedOfferId: null };
  });
}

export async function closeNoDeal(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) =>
    w.status === "sold" || w.status === "no_deal"
      ? "This post is already closed."
      : { status: "no_deal", closedReason: "buyer_closed", acceptedOfferId: null, closedAt: new Date() },
  );
}

/* ---------- Seller: alert settings ---------- */

export async function updateInterests(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.seller) return;
  await db
    .update(s.sellerProfile)
    .set({ interests: parseInterests(str(formData, "interests")) })
    .where(eq(s.sellerProfile.userId, user.id));
  revalidatePath("/alerts");
}
