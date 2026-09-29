import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { conditionLabel, displayName, money, offerTotal, rankOffers, timeAgo, timeLeft } from "@/lib/format";
import { CardArt, ScopeBadge, StatusBadge } from "@/components/ui";
import { OfferForm } from "@/components/OfferForm";
import { SignUpGate } from "@/components/SignUpGate";
import { RecordView } from "@/components/RecentHistory";
import { acceptOffer, closeNoDeal, markSold, reopenWant } from "@/app/actions";

export default async function WantPage({ params }: PageProps<"/wants/[id]">) {
  const { id } = await params;
  const [user] = await Promise.all([getCurrentUser(), expireWants()]);
  const [row] = await db
    .select({ want: s.want, buyerName: s.user.name })
    .from(s.want)
    .innerJoin(s.user, eq(s.user.id, s.want.buyerId))
    .where(eq(s.want.id, id));
  if (!row) notFound();
  const { want, buyerName } = row;

  const allOffers = await db
    .select({ offer: s.offer, name: s.user.name, city: s.user.city, state: s.user.state, seller: s.sellerProfile })
    .from(s.offer)
    .innerJoin(s.user, eq(s.user.id, s.offer.sellerId))
    .leftJoin(s.sellerProfile, eq(s.sellerProfile.userId, s.offer.sellerId))
    .where(eq(s.offer.wantId, want.id));

  const isOwner = user?.id === want.buyerId;
  const active = allOffers.filter((r) => !r.offer.supersededAt).sort((a, b) => rankOffers(a.offer, b.offer));
  const history = allOffers
    .filter((r) => r.offer.supersededAt)
    .sort((a, b) => b.offer.createdAt.getTime() - a.offer.createdAt.getTime());
  const lowest = active[0]?.offer;
  const accepted = allOffers.find((r) => r.offer.id === want.acceptedOfferId);
  const myOffer = active.find((r) => r.offer.sellerId === user?.id);
  const iHaveBest = !!lowest && lowest.sellerId === user?.id && lowest.id !== want.acceptedOfferId;
  const offerForm = (
    <OfferForm
      wantId={want.id}
      hasOffer={!!myOffer}
      lowestTotal={lowest ? money(offerTotal(lowest)) : undefined}
      youAreLowest={iHaveBest}
    />
  );

  return (
    <div className="space-y-8">
      {/* version changes when offers or status change, so the history panel refreshes */}
      <RecordView wantId={want.id} version={`${want.status}:${active.map((r) => r.offer.id).join(",")}`} />
      <Link href="/" className="text-sm text-ink-muted hover:text-ink">
        ← All wants
      </Link>

      <section className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div>
          <CardArt want={want} />
        </div>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={want.status} />
            <ScopeBadge want={want} />
            {want.status === "open" && (
              <span className="text-xs text-ink-muted">Public for {timeLeft(want.expiresAt)}</span>
            )}
            {want.closedReason === "expired" && (
              <span className="text-xs text-ink-muted">Expired without a pick</span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{want.cardName}</h1>
            <p className="mt-1 text-ink-muted">
              {want.setName}
              {want.cardNumber && ` · ${want.cardNumber}`}
              {want.rarity && ` · ${want.rarity}`}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Quality" value={conditionLabel(want.condition)} />
            <Stat label="Budget" value={`${money(want.priceMin)}–${money(want.priceMax)}`} />
            <Stat label="Lowest offer" value={lowest ? money(offerTotal(lowest)) : "—"} accent={!!lowest} />
            <Stat label="Market (ungraded)" value={want.marketPrice != null ? money(want.marketPrice) : "—"} />
            <Stat label="Posted by" value={`${buyerName} · ${timeAgo(want.createdAt)}`} />
          </dl>
          {want.description && <p className="max-w-2xl whitespace-pre-line">{want.description}</p>}

          {isOwner && (
            <div className="panel flex flex-wrap items-center gap-3 p-4">
              <span className="text-sm font-medium">Your post:</span>
              {want.status === "open" && (
                <>
                  <span className="text-sm text-ink-muted">Accept an offer below to move it to Pending.</span>
                  <form action={closeNoDeal} className="ml-auto">
                    <input type="hidden" name="wantId" value={want.id} />
                    <button className="btn-secondary">Close — no deal</button>
                  </form>
                </>
              )}
              {want.status === "pending" && accepted && (
                <>
                  <span className="text-sm text-ink-muted">
                    Deal in progress with {displayName(accepted)} at {money(offerTotal(accepted.offer))}.
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <form action={markSold}>
                      <input type="hidden" name="wantId" value={want.id} />
                      <button className="btn-primary">Mark sold</button>
                    </form>
                    <form action={reopenWant}>
                      <input type="hidden" name="wantId" value={want.id} />
                      <button className="btn-secondary">Reopen to offers</button>
                    </form>
                    <form action={closeNoDeal}>
                      <input type="hidden" name="wantId" value={want.id} />
                      <button className="btn-secondary">Close — no deal</button>
                    </form>
                  </div>
                </>
              )}
              {(want.status === "sold" || want.status === "no_deal") && (
                <span className="text-sm text-ink-muted">This post is closed.</span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="mb-3 text-lg font-semibold">
            Public offers <span className="font-normal text-ink-muted">({active.length})</span>
          </h2>
          {active.length === 0 ? (
            <div className="panel p-8 text-center text-ink-muted">No offers yet.</div>
          ) : (
            <ol className="space-y-3">
              {active.map((r, i) => {
                const o = r.offer;
                const isAccepted = o.id === want.acceptedOfferId;
                const isBest = i === 0 && !isAccepted;
                const isMineBest = isBest && o.sellerId === user?.id;
                return (
                  <li
                    key={o.id}
                    className={`panel flex flex-wrap items-start gap-4 p-4 ${
                      isAccepted
                        ? "border-pending ring-2 ring-pending/20"
                        : isMineBest
                          ? "best-offer best-offer-mine"
                          : isBest
                            ? "best-offer"
                            : ""
                    }`}
                  >
                    <div className="w-24 shrink-0">
                      <div className={`text-xl font-semibold tabular-nums ${isMineBest ? "text-gold-ink" : isBest ? "text-open" : ""}`}>
                        {money(offerTotal(o))}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {o.fulfillment === "local"
                          ? "local meetup"
                          : o.shipping
                            ? `${money(o.price)} + ${money(o.shipping)} ship`
                            : "free shipping"}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{displayName(r)}</span>
                        {r.seller?.sellerType === "company" && (
                          <span className="rounded bg-surface-2 px-1.5 text-xs text-ink-muted">Shop</span>
                        )}
                        {isMineBest && (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-gold px-1.5 text-xs font-semibold text-ink">
                            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                              <path d="M1 9.5h10L10 3 7.5 5.5 6 1.5 4.5 5.5 2 3z" fill="currentColor" />
                            </svg>
                            Your offer is the best
                          </span>
                        )}
                        {isBest && !isMineBest && (
                          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-open px-1.5 text-xs font-medium text-surface">
                            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                              <path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12l-1.4-4.6L0 6l4.6-1.4z" fill="currentColor" />
                            </svg>
                            Best offer
                          </span>
                        )}
                        {isAccepted && (
                          <span className="rounded bg-pending-soft px-1.5 text-xs font-medium text-pending">
                            Accepted
                          </span>
                        )}
                        <span className="text-xs text-ink-muted">
                          {r.city}, {r.state} · {timeAgo(o.createdAt)}
                        </span>
                      </div>
                      {o.message && <p className="mt-1 text-sm">{o.message}</p>}
                    </div>
                    {isOwner && want.status === "open" && (
                      <form action={acceptOffer}>
                        <input type="hidden" name="wantId" value={want.id} />
                        <input type="hidden" name="offerId" value={o.id} />
                        <button className="btn-secondary">Accept</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {history.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ink-muted">
                Earlier offers ({history.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-ink-muted">
                {history.map((r) => (
                  <li key={r.offer.id}>
                    <span className="line-through">{money(offerTotal(r.offer))}</span> from {displayName(r)} ·{" "}
                    {timeAgo(r.offer.createdAt)}, since revised
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside>
          {want.status !== "open" ? (
            !isOwner && <div className="panel p-5 text-sm text-ink-muted">This post isn&apos;t taking offers.</div>
          ) : !user ? (
            <SignUpGate>{offerForm}</SignUpGate>
          ) : isOwner ? null : user.seller ? (
            offerForm
          ) : (
            <div className="panel space-y-3 p-5">
              <h2 className="font-semibold">Have this card?</h2>
              <p className="text-sm text-ink-muted">
                Set up your seller profile to make offers. It takes a minute, and nothing changes about how you buy.
              </p>
              <Link href={`/seller/setup?next=/wants/${want.id}`} className="btn-primary">
                Set up seller profile
              </Link>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={`mt-0.5 font-medium ${accent ? "text-open" : ""}`}>{value}</dd>
    </div>
  );
}
