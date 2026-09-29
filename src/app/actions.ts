"use server";

import { promises as fs } from "fs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mutateDb, newId, UPLOAD_DIR, uploadPath } from "@/lib/db";
import { getCurrentUser, USER_COOKIE } from "@/lib/session";
import { getCard } from "@/lib/tcgdex";
import {
  GRADING_COMPANIES,
  RAW_CONDITIONS,
  type CardCondition,
  type Database,
  type Want,
} from "@/lib/types";

export type FormState = { error?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(str(fd, key));

export async function switchUser(formData: FormData) {
  (await cookies()).set(USER_COOKIE, str(formData, "userId"), { path: "/" });
  revalidatePath("/", "layout");
}

/* ---------- Buyer: post a want ---------- */

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

async function saveImage(file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Photo must be a JPG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Photo must be under 5 MB.");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return `/api/uploads/${name}`;
}

/** Sends an alert to each seller whose interests match the new want. */
function queueSellerAlerts(db: Database, want: Want) {
  const haystack = `${want.cardName} ${want.setName}`.toLowerCase();
  for (const seller of db.users.filter((u) => u.role === "seller")) {
    if (want.scope === "local" && seller.location.state !== want.location.state) continue;
    const hit = seller.interests?.find((k) => haystack.includes(k.toLowerCase()));
    if (!hit) continue;
    db.alerts.push({
      id: newId("a"),
      sellerId: seller.id,
      wantId: want.id,
      matchedOn: hit,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }
}

export async function createWant(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (user.role !== "buyer") return { error: "Only buyer accounts can post wants." };

  const cardName = str(formData, "cardName");
  const setName = str(formData, "setName");
  const priceMin = num(formData, "priceMin");
  const priceMax = num(formData, "priceMax");
  const days = Math.min(14, Math.max(1, num(formData, "days") || 3));

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

  let imagePath: string | undefined;
  try {
    imagePath = await saveImage(formData.get("photo") as File | null);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // If the buyer picked a card from search, re-fetch it server-side for the official image and market price.
  const tcgCardId = str(formData, "tcgCardId");
  const card = tcgCardId ? await getCard(tcgCardId) : undefined;

  const now = new Date();
  const want: Want = {
    id: newId("w"),
    buyerId: user.id,
    cardName,
    setName,
    cardNumber: str(formData, "cardNumber") || undefined,
    description: str(formData, "description"),
    imagePath,
    tcgCardId: card?.id,
    officialImage: card?.image,
    rarity: card?.rarity,
    marketPrice: card?.marketPrice,
    condition,
    priceMin,
    priceMax,
    scope: str(formData, "scope") === "local" ? "local" : "nationwide",
    location: user.location,
    status: "open",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + days * 86_400_000).toISOString(),
  };

  await mutateDb((db) => {
    db.wants.push(want);
    queueSellerAlerts(db, want);
  });

  revalidatePath("/");
  redirect(`/wants/${want.id}`);
}

/* ---------- Seller: make an offer ---------- */

export async function createOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (user.role !== "seller") return { error: "Switch to a seller account to make an offer." };

  const wantId = str(formData, "wantId");
  const price = num(formData, "price");
  const fulfillment = str(formData, "fulfillment") === "local" ? "local" : "ship";
  const shipping = fulfillment === "local" ? 0 : num(formData, "shipping") || 0;
  if (!(price > 0)) return { error: "Enter an offer price." };
  if (shipping < 0) return { error: "Shipping can't be negative." };

  const error = await mutateDb((db) => {
    const want = db.wants.find((w) => w.id === wantId);
    if (!want) return "That post no longer exists.";
    if (want.status !== "open") return "This post isn't taking offers right now.";
    const now = new Date().toISOString();
    // A seller's newest offer replaces their previous one, but the old one stays public.
    for (const o of db.offers) {
      if (o.wantId === wantId && o.sellerId === user.id && !o.supersededAt) o.supersededAt = now;
    }
    db.offers.push({
      id: newId("o"),
      wantId,
      sellerId: user.id,
      price,
      shipping,
      fulfillment,
      message: str(formData, "message"),
      createdAt: now,
    });
    db.alerts.forEach((a) => {
      if (a.wantId === wantId && a.sellerId === user.id) a.read = true;
    });
  });
  if (error) return { error };

  revalidatePath(`/wants/${wantId}`);
  revalidatePath("/");
  return undefined;
}

/* ---------- Buyer: move a post through its states ---------- */

async function updateOwnWant(wantId: string, fn: (w: Want) => string | void) {
  const user = await getCurrentUser();
  const error = await mutateDb((db) => {
    const want = db.wants.find((w) => w.id === wantId);
    if (!want) return "Post not found.";
    if (want.buyerId !== user.id) return "Only the buyer can change this post.";
    return fn(want) ?? undefined;
  });
  if (error) throw new Error(error);
  revalidatePath(`/wants/${wantId}`);
  revalidatePath("/");
}

export async function acceptOffer(formData: FormData) {
  const offerId = str(formData, "offerId");
  await updateOwnWant(str(formData, "wantId"), (w) => {
    if (w.status !== "open") return "Offers can only be accepted while the post is open.";
    w.status = "pending";
    w.acceptedOfferId = offerId;
  });
}

export async function markSold(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) => {
    if (w.status !== "pending") return "Only pending posts can be marked sold.";
    w.status = "sold";
    w.closedReason = "sold";
    w.closedAt = new Date().toISOString();
  });
}

export async function reopenWant(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) => {
    if (w.status !== "pending") return "Only pending posts can be reopened.";
    if (Date.parse(w.expiresAt) <= Date.now()) return "This post has expired.";
    w.status = "open";
    w.acceptedOfferId = undefined;
  });
}

export async function closeNoDeal(formData: FormData) {
  await updateOwnWant(str(formData, "wantId"), (w) => {
    if (w.status === "sold" || w.status === "no_deal") return "This post is already closed.";
    w.status = "no_deal";
    w.closedReason = "buyer_closed";
    w.acceptedOfferId = undefined;
    w.closedAt = new Date().toISOString();
  });
}

/* ---------- Seller: alert settings ---------- */

export async function updateInterests(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role !== "seller") return;
  const interests = str(formData, "interests")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  await mutateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.interests = [...new Set(interests)];
  });
  revalidatePath("/alerts");
}
