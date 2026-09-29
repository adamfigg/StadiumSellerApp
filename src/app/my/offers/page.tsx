import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { conditionLabel, money, offerTotal, rankOffers, timeAgo, timeLeft } from "@/lib/format";
import { CardArt, StatusBadge } from "@/components/ui";
import type { Offer, Want } from "@/lib/types";

export const metadata: Metadata = { title: "My offers · Stadium" };

type Standing = "leading" | "outbid" | "accepted" | "won" | "lost" | "closed";

type Row = {
  offer: Offer;
  want: Want;
  buyerName: string;
  standing: Standing;
  rank: number;
  of: number;
  lowest: number;
};

/** Every current offer the signed-in seller has made, with where it stands. */
export default async function MyOffersPage() {
  const user = await requireUser("/my/offers");

  if (!user.seller) {
    return (
      <div className="panel mx-auto max-w-lg space-y-3 p-8 text-center">
        <h1 className="text-xl font-semibold">My offers is for sellers</h1>
        <p className="text-ink-muted">Set up your seller profile to make offers on buyers&apos; wants.</p>
        <Link href="/seller/setup?next=/my/offers" className="btn-primary">
          Set up seller profile
        </Link>
      </div>
    );
  }

  await expireWants();
  // Your current offer on each post (revised ones are superseded and left out).
  const mine = await db
    .select({ offer: s.offer, want: s.want, buyerName: s.user.name })
    .from(s.offer)
    .innerJoin(s.want, eq(s.want.id, s.offer.wantId))
    .innerJoin(s.user, eq(s.user.id, s.want.buyerId))
    .where(and(eq(s.offer.sellerId, user.id), isNull(s.offer.supersededAt)))
    .orderBy(desc(s.offer.createdAt));

  const competing = mine.length
    ? await db
        .select()
        .from(s.offer)
        .where(and(inArray(s.offer.wantId, mine.map((m) => m.want.id)), isNull(s.offer.supersededAt)))
    : [];

  const rows: Row[] = mine.map(({ offer, want, buyerName }) => {
    const ranked = competing.filter((o) => o.wantId === want.id).sort(rankOffers);
    const rank = ranked.findIndex((o) => o.id === offer.id) + 1;
    const isAccepted = want.acceptedOfferId === offer.id;
    const standing: Standing =
      want.status === "open"
        ? rank === 1
          ? "leading"
          : "outbid"
        : want.status === "pending"
          ? isAccepted
            ? "accepted"
            : "lost"
          : want.status === "sold"
            ? isAccepted
              ? "won"
              : "lost"
            : "closed";
    return { offer, want, buyerName, standing, rank, of: ranked.length, lowest: offerTotal(ranked[0] ?? offer) };
  });

  const active = rows
    .filter((r) => r.standing === "leading" || r.standing === "outbid")
    .sort((a, b) => (a.standing === b.standing ? a.want.expiresAt.getTime() - b.want.expiresAt.getTime() : a.standing === "leading" ? -1 : 1));
  const deals = rows.filter((r) => r.standing === "accepted" || r.standing === "won");
  const done = rows.filter((r) => r.standing === "lost" || r.standing === "closed");
  const count = (st: Standing) => rows.filter((r) => r.standing === st).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My offers</h1>
          <p className="mt-2 text-ink-muted">Every offer you&apos;ve made to buyers, and whether you&apos;re winning it.</p>
        </div>
        <Link href="/alerts" className="btn-secondary shrink-0">
          Find more buyers
        </Link>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Leading" value={count("leading")} tone="gold" />
        <Stat label="Outbid" value={count("outbid")} tone={count("outbid") ? "brand" : undefined} />
        <Stat label="Accepted" value={count("accepted")} tone={count("accepted") ? "pending" : undefined} />
        <Stat label="Won" value={count("won")} tone={count("won") ? "open" : undefined} />
      </dl>

      {rows.length === 0 ? (
        <div className="panel space-y-3 p-10 text-center">
          <p className="text-ink-muted">You haven&apos;t made any offers yet.</p>
          <Link href="/" className="btn-primary">
            Browse buyers&apos; wants
          </Link>
        </div>
      ) : (
        <>
          <Group title="Accepted and won" hint="Buyers picked your offer." rows={deals} />
          <Group title="Active" hint="Open posts. Revise an offer to take the lead." rows={active} />
          <Group title="Closed" rows={done} />
        </>
      )}
    </div>
  );
}

function Group({ title, hint, rows }: { title: string; hint?: string; rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">
          {title} <span className="font-normal text-ink-muted">({rows.length})</span>
        </h2>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.offer.id}>
            <OfferRow row={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OfferRow({ row: { offer, want, buyerName, standing, rank, of, lowest } }: { row: Row }) {
  const total = offerTotal(offer);
  const note: Record<Standing, React.ReactNode> = {
    leading: <span className="font-semibold text-gold-ink">★ You have the lowest offer{of > 1 ? ` of ${of}` : ""}</span>,
    outbid: (
      <>
        <span className="font-medium text-brand">Outbid: beat {money(lowest)} →</span>{" "}
        <span className="text-ink-muted">
          you&apos;re #{rank} of {of}
        </span>
      </>
    ),
    accepted: <span className="font-medium text-pending">Accepted. The buyer is finalizing the deal.</span>,
    won: <span className="font-medium text-open">You won this sale</span>,
    lost: <span className="text-ink-muted">The buyer went with another offer</span>,
    closed: <span className="text-ink-muted">Closed without a deal</span>,
  };
  return (
    <Link
      href={`/wants/${want.id}`}
      className={`panel flex h-full gap-4 p-3 transition-shadow hover:shadow-md sm:p-4 ${
        standing === "leading"
          ? "best-offer best-offer-mine"
          : standing === "accepted"
            ? "border-pending ring-2 ring-pending/20"
            : standing === "lost" || standing === "closed"
              ? "opacity-75"
              : ""
      }`}
    >
      <div className="w-16 shrink-0">
        <CardArt want={want} size="low" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{want.cardName}</span>
          <StatusBadge status={want.status} />
          {want.status === "open" && <span className="text-xs text-ink-muted">{timeLeft(want.expiresAt)}</span>}
        </div>
        <div className="truncate text-sm text-ink-muted">
          {want.setName} · {conditionLabel(want.condition)} · {buyerName}&apos;s budget {money(want.priceMin)}–
          {money(want.priceMax)}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span>
            Your offer{" "}
            <span className={`font-semibold tabular-nums ${standing === "leading" ? "text-gold-ink" : ""}`}>
              {money(total)}
            </span>
          </span>
          <span className="text-xs text-ink-muted">
            {offer.fulfillment === "local"
              ? "local meetup"
              : offer.shipping
                ? `${money(offer.price)} + ${money(offer.shipping)} ship`
                : "free shipping"}{" "}
            · {timeAgo(offer.createdAt)}
          </span>
        </div>
        <div className="mt-auto text-sm">{note[standing]}</div>
      </div>
    </Link>
  );
}

const TONES = { gold: "text-gold-ink", brand: "text-brand", pending: "text-pending", open: "text-open" } as const;

function Stat({ label, value, tone }: { label: string; value: number; tone?: keyof typeof TONES }) {
  return (
    <div className="panel p-4">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${tone ? TONES[tone] : ""}`}>{value}</dd>
    </div>
  );
}
