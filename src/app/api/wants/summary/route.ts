import { and, inArray, isNull } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { rankOffers } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export type WantSummary = {
  id: string;
  cardName: string;
  setName: string;
  officialImage: string | null;
  status: "open" | "pending" | "sold" | "no_deal";
  priceMin: number;
  priceMax: number;
  offerCount: number;
  lowestOffer: number | null;
  /** The signed-in viewer's own offer holds the lowest price (and hasn't already been accepted). */
  mineIsBest: boolean;
};

const MAX_IDS = 20;

/** Current status, budget and lowest offer for a list of posts, in the order requested, plus whether the viewer leads. */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[\w-]{1,64}$/.test(id))
    .slice(0, MAX_IDS);
  if (!ids.length) return Response.json([]);

  const [user] = await Promise.all([getCurrentUser(), expireWants()]);
  const [wants, offers] = await Promise.all([
    db
      .select({
        id: s.want.id,
        cardName: s.want.cardName,
        setName: s.want.setName,
        officialImage: s.want.officialImage,
        status: s.want.status,
        priceMin: s.want.priceMin,
        priceMax: s.want.priceMax,
        acceptedOfferId: s.want.acceptedOfferId,
      })
      .from(s.want)
      .where(inArray(s.want.id, ids)),
    db
      .select({ id: s.offer.id, wantId: s.offer.wantId, sellerId: s.offer.sellerId, price: s.offer.price, shipping: s.offer.shipping, createdAt: s.offer.createdAt })
      .from(s.offer)
      .where(and(inArray(s.offer.wantId, ids), isNull(s.offer.supersededAt))),
  ]);

  const byId = new Map(wants.map((w) => [w.id, w]));
  const summaries: WantSummary[] = ids.flatMap((id) => {
    const w = byId.get(id);
    if (!w) return [];
    const { acceptedOfferId, ...rest } = w;
    const ranked = offers.filter((o) => o.wantId === id).sort(rankOffers);
    const best = ranked[0];
    return [
      {
        ...rest,
        offerCount: ranked.length,
        lowestOffer: best ? best.price + best.shipping : null,
        mineIsBest: !!user && !!best && best.sellerId === user.id && best.id !== acceptedOfferId,
      },
    ];
  });
  return Response.json(summaries, { headers: { "Cache-Control": "no-store" } });
}
