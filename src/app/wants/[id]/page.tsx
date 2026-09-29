import Link from "next/link";
import { notFound } from "next/navigation";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { conditionLabel, displayName, money, offerTotal, timeAgo, timeLeft } from "@/lib/format";
import { CardArt, ScopeBadge, StatusBadge } from "@/components/ui";
import { OfferForm } from "@/components/OfferForm";
import { acceptOffer, closeNoDeal, markSold, reopenWant } from "@/app/actions";

export default async function WantPage({ params }: PageProps<"/wants/[id]">) {
  const { id } = await params;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const want = db.wants.find((w) => w.id === id);
  if (!want) notFound();

  const buyer = db.users.find((u) => u.id === want.buyerId);
  const isOwner = user.id === want.buyerId;
  const allOffers = db.offers.filter((o) => o.wantId === want.id);
  const active = allOffers.filter((o) => !o.supersededAt).sort((a, b) => offerTotal(a) - offerTotal(b));
  const history = allOffers
    .filter((o) => o.supersededAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const lowest = active[0];
  const accepted = allOffers.find((o) => o.id === want.acceptedOfferId);
  const seller = (sid: string) => db.users.find((u) => u.id === sid);
  const myOffer = active.find((o) => o.sellerId === user.id);

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-ink-muted hover:text-ink">
        ← All wants
      </Link>

      <section className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <CardArt want={want} />
          {want.officialImage && want.imagePath && (
            <div>
              <p className="mb-1 text-xs text-ink-muted">Buyer&apos;s reference photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- local upload */}
              <img src={want.imagePath} alt="Buyer's photo" className="w-24 rounded-md" />
            </div>
          )}
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
            <Stat
              label="Lowest offer"
              value={lowest ? money(offerTotal(lowest)) : "—"}
              accent={!!lowest}
            />
            <Stat
              label="Market (ungraded)"
              value={want.marketPrice !== undefined ? money(want.marketPrice) : "—"}
            />
            <Stat label="Posted by" value={`${buyer?.name ?? "Buyer"} · ${timeAgo(want.createdAt)}`} />
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
                    Deal in progress with {displayName(seller(accepted.sellerId))} at{" "}
                    {money(offerTotal(accepted))}.
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
              {active.map((o, i) => {
                const s = seller(o.sellerId);
                const isAccepted = o.id === want.acceptedOfferId;
                return (
                  <li
                    key={o.id}
                    className={`panel flex flex-wrap items-start gap-4 p-4 ${
                      isAccepted ? "border-pending ring-2 ring-pending/20" : i === 0 ? "border-open" : ""
                    }`}
                  >
                    <div className="w-24 shrink-0">
                      <div className="text-xl font-semibold tabular-nums">{money(offerTotal(o))}</div>
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
                        <span className="font-medium">{displayName(s)}</span>
                        {s?.sellerType === "company" && (
                          <span className="rounded bg-surface-2 px-1.5 text-xs text-ink-muted">Shop</span>
                        )}
                        {i === 0 && !isAccepted && (
                          <span className="rounded bg-open-soft px-1.5 text-xs font-medium text-open">
                            Lowest
                          </span>
                        )}
                        {isAccepted && (
                          <span className="rounded bg-pending-soft px-1.5 text-xs font-medium text-pending">
                            Accepted
                          </span>
                        )}
                        <span className="text-xs text-ink-muted">
                          {s?.location.city}, {s?.location.state} · {timeAgo(o.createdAt)}
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
                {history.map((o) => (
                  <li key={o.id}>
                    <span className="line-through">{money(offerTotal(o))}</span> from{" "}
                    {displayName(seller(o.sellerId))} · {timeAgo(o.createdAt)}, since revised
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside>
          {user.role === "seller" && want.status === "open" ? (
            <OfferForm
              wantId={want.id}
              hasOffer={!!myOffer}
              lowestTotal={lowest ? money(offerTotal(lowest)) : undefined}
            />
          ) : user.role === "seller" ? (
            <div className="panel p-5 text-sm text-ink-muted">This post isn&apos;t taking offers.</div>
          ) : !isOwner ? (
            <div className="panel p-5 text-sm text-ink-muted">
              Switch to a seller account in the header to make an offer.
            </div>
          ) : null}
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
