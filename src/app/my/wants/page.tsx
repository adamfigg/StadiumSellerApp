import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { conditionLabel, displayName, money, offerTotal, rankOffers, timeAgo, timeLeft } from "@/lib/format";
import { CardArt, StatusBadge } from "@/components/ui";
import type { Want } from "@/lib/types";

export const metadata: Metadata = { title: "My wants · Stadium" };

/** Every post the signed-in user has made, grouped by what needs their attention. */
export default async function MyWantsPage() {
  const user = await requireUser("/my/wants");
  await expireWants();

  const wants = await db.select().from(s.want).where(eq(s.want.buyerId, user.id)).orderBy(desc(s.want.createdAt));
  const offers = wants.length
    ? await db
        .select({ offer: s.offer, name: s.user.name, seller: s.sellerProfile })
        .from(s.offer)
        .innerJoin(s.user, eq(s.user.id, s.offer.sellerId))
        .leftJoin(s.sellerProfile, eq(s.sellerProfile.userId, s.offer.sellerId))
        .where(and(inArray(s.offer.wantId, wants.map((w) => w.id)), isNull(s.offer.supersededAt)))
    : [];
  const offersFor = (id: string) => offers.filter((r) => r.offer.wantId === id).sort((a, b) => rankOffers(a.offer, b.offer));

  const open = wants.filter((w) => w.status === "open").sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  const pending = wants.filter((w) => w.status === "pending");
  const closed = wants.filter((w) => w.status === "sold" || w.status === "no_deal");
  const offersWaiting = open.reduce((n, w) => n + offersFor(w.id).length, 0);

  const row = (w: Want) => {
    const ranked = offersFor(w.id);
    const best = ranked[0];
    const accepted = ranked.find((r) => r.offer.id === w.acceptedOfferId);
    let note: React.ReactNode;
    if (w.status === "open") {
      note = best ? (
        <>
          <span className="font-medium text-brand">Review {ranked.length} {ranked.length === 1 ? "offer" : "offers"} →</span>{" "}
          <span className="text-ink-muted">lowest {money(offerTotal(best.offer))} from {displayName(best)}</span>
        </>
      ) : (
        <span className="text-ink-muted">No offers yet</span>
      );
    } else if (w.status === "pending") {
      note = accepted ? (
        <>
          <span className="font-medium text-pending">Deal in progress</span>{" "}
          <span className="text-ink-muted">
            with {displayName(accepted)} at {money(offerTotal(accepted.offer))}. Mark it sold or reopen it.
          </span>
        </>
      ) : (
        <span className="text-pending">Deal in progress</span>
      );
    } else if (w.status === "sold") {
      note = (
        <span className="text-ink-muted">
          Sold{accepted ? ` by ${displayName(accepted)} for ${money(offerTotal(accepted.offer))}` : ""}
          {w.closedAt && ` · ${timeAgo(w.closedAt)}`}
        </span>
      );
    } else {
      note = (
        <span className="text-ink-muted">
          {w.closedReason === "expired" ? "Expired without a pick" : "You closed it without a deal"}
          {w.closedAt && ` · ${timeAgo(w.closedAt)}`}
        </span>
      );
    }
    return (
      <li key={w.id}>
        <Link href={`/wants/${w.id}`} className="panel flex gap-4 p-3 transition-shadow hover:shadow-md sm:p-4">
          <div className="w-16 shrink-0">
            <CardArt want={w} size="low" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{w.cardName}</span>
              <StatusBadge status={w.status} />
              {w.status === "open" && <span className="text-xs text-ink-muted">{timeLeft(w.expiresAt)}</span>}
            </div>
            <div className="truncate text-sm text-ink-muted">
              {w.setName}
              {w.cardNumber && ` · ${w.cardNumber}`} · {conditionLabel(w.condition)} · budget {money(w.priceMin)}–
              {money(w.priceMax)}
            </div>
            <div className="mt-auto text-sm">{note}</div>
          </div>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My wants</h1>
          <p className="mt-2 text-ink-muted">Every card you&apos;ve asked for, and where each deal stands.</p>
        </div>
        <Link href="/wants/new" className="btn-primary shrink-0">
          Post a want
        </Link>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={open.length} />
        <Stat label="Offers to review" value={offersWaiting} accent={offersWaiting > 0} />
        <Stat label="Pending" value={pending.length} />
        <Stat label="Closed" value={closed.length} />
      </dl>

      {wants.length === 0 ? (
        <div className="panel space-y-3 p-10 text-center">
          <p className="text-ink-muted">You haven&apos;t posted any wants yet.</p>
          <Link href="/wants/new" className="btn-primary">
            Post your first want
          </Link>
        </div>
      ) : (
        <>
          <Group title="Pending" hint="You accepted an offer. Mark it sold once you've paid, or reopen it." items={pending} row={row} />
          <Group title="Open" hint="Taking offers now, ending soonest first." items={open} row={row} />
          <Group title="Closed" items={closed} row={row} />
        </>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  items,
  row,
}: {
  title: string;
  hint?: string;
  items: Want[];
  row: (w: Want) => React.ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">
          {title} <span className="font-normal text-ink-muted">({items.length})</span>
        </h2>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">{items.map(row)}</ul>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="panel p-4">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-brand" : ""}`}>{value}</dd>
    </div>
  );
}
