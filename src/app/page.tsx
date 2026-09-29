import Link from "next/link";
import { and, desc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getViewMode } from "@/lib/view-mode";
import { matchInterest } from "@/lib/matching";
import { conditionLabel, money, offerTotal, rankOffers, timeLeft } from "@/lib/format";
import { CardArt, StatusBadge } from "@/components/ui";
import { SignUpGate } from "@/components/SignUpGate";
import type { Want, WantStatus } from "@/lib/types";

const FILTERS: { key: string; label: string; statuses: WantStatus[] }[] = [
  { key: "open", label: "Open", statuses: ["open"] },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "closed", label: "Closed", statuses: ["sold", "no_deal"] },
  { key: "all", label: "All", statuses: ["open", "pending", "sold", "no_deal"] },
];

type OfferRow = { wantId: string; sellerId: string; price: number; shipping: number; createdAt: Date };

export default async function BrowsePage({ searchParams }: PageProps<"/">) {
  const { status = "open", q = "" } = await searchParams;
  const [user] = await Promise.all([getCurrentUser(), expireWants()]);
  const mode = await getViewMode(user);
  const seller = mode === "selling" ? user?.seller : null;

  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const query = String(q).trim();
  const like = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

  const [wants, matches] = await Promise.all([
    db
      .select()
      .from(s.want)
      .where(
        and(
          inArray(s.want.status, filter.statuses),
          query
            ? or(ilike(s.want.cardName, like), ilike(s.want.setName, like), ilike(s.want.cardNumber, like))
            : undefined,
        ),
      )
      .orderBy(desc(s.want.createdAt)),
    // Selling view: open posts from other people that match the cards this seller sells.
    seller && user && seller.interests.length
      ? db
          .select()
          .from(s.want)
          .where(and(eq(s.want.status, "open"), ne(s.want.buyerId, user.id)))
          .orderBy(desc(s.want.createdAt))
          .then((rows) =>
            rows.flatMap((w) => {
              const hit = matchInterest(w, { interests: seller.interests, state: user.state });
              return hit ? [{ want: w, matchedOn: hit }] : [];
            }),
          )
      : [],
  ]);

  const wantIds = [...new Set([...wants, ...matches.map((m) => m.want)].map((w) => w.id))];
  const offers: OfferRow[] = wantIds.length
    ? await db
        .select({
          wantId: s.offer.wantId,
          sellerId: s.offer.sellerId,
          price: s.offer.price,
          shipping: s.offer.shipping,
          createdAt: s.offer.createdAt,
        })
        .from(s.offer)
        .where(and(inArray(s.offer.wantId, wantIds), isNull(s.offer.supersededAt)))
    : [];
  const offersFor = (id: string) => offers.filter((o) => o.wantId === id);

  const href = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: filter.key, q: query || undefined, ...next };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/?${p}`;
  };

  const postButton = (
    <Link href="/wants/new" className="btn-primary shrink-0">
      Post a want
    </Link>
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {seller ? (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Buyers are waiting.</h1>
            <p className="mt-2 max-w-xl text-ink-muted">
              Here&apos;s who wants the cards you sell. Every offer is public, so beat the lowest delivered
              price to win the deal.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Buyers post. Sellers compete.</h1>
            <p className="mt-2 max-w-xl text-ink-muted">
              Every want is public, and so is every offer on it. Sellers see what they need to beat,
              and buyers pick the deal they like.
            </p>
          </div>
        )}
        {seller ? (
          <Link href="/alerts" className="btn-secondary shrink-0">
            Edit what I sell
          </Link>
        ) : user ? (
          postButton
        ) : (
          <SignUpGate next="/wants/new">{postButton}</SignUpGate>
        )}
      </section>

      {seller && user && (
        <section className="space-y-4 rounded-2xl border border-open/30 bg-open-soft/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Buyers looking for cards you sell</h2>
              <p className="text-sm text-ink-muted">
                {seller.interests.length ? (
                  <>
                    Open posts matching{" "}
                    {seller.interests.map((k, i) => (
                      <span key={k}>
                        {i > 0 && ", "}
                        <span className="font-medium text-ink">{k}</span>
                      </span>
                    ))}
                    . Local-preferred posts only show if you&apos;re in the buyer&apos;s state.
                  </>
                ) : (
                  "Tell us what you sell and matching buyers show up here."
                )}
              </p>
            </div>
            <span className="text-sm font-medium text-open">
              {matches.length} {matches.length === 1 ? "buyer" : "buyers"}
            </span>
          </div>
          {!seller.interests.length ? (
            <div className="panel p-6 text-center text-sm text-ink-muted">
              Add keywords for the cards you have, like <em>charizard</em> or <em>evolving skies</em>.{" "}
              <Link href="/alerts" className="font-medium text-brand hover:underline">
                Add what you sell
              </Link>
            </div>
          ) : matches.length === 0 ? (
            <div className="panel p-6 text-center text-sm text-ink-muted">
              No open posts match what you sell right now. You&apos;ll get an alert when one does.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map(({ want, matchedOn }) => {
                const wantOffers = offersFor(want.id);
                const mineNow = wantOffers.find((o) => o.sellerId === user.id);
                const best = [...wantOffers].sort(rankOffers)[0];
                const lowest = best && offerTotal(best);
                return (
                  <li key={want.id}>
                    <WantCard
                      want={want}
                      offers={wantOffers}
                      tag={<span className="rounded bg-surface px-1.5 text-xs text-open">matches “{matchedOn}”</span>}
                      footer={
                        mineNow ? (
                          best.sellerId === user.id ? (
                            <span className="font-semibold text-gold-ink">★ You have the best offer</span>
                          ) : (
                            <span>
                              Your offer {money(offerTotal(mineNow))}{" "}
                              <span className="text-ink-muted">· beat {money(lowest!)}</span>
                            </span>
                          )
                        ) : (
                          <span className="font-medium text-brand">
                            {lowest !== undefined ? `Beat ${money(lowest)} →` : "Be the first offer →"}
                          </span>
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-4">
        {seller && <h2 className="text-lg font-semibold">All posts</h2>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={href({ status: f.key })}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  f.key === filter.key ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form className="sm:ml-auto sm:w-72">
            <input type="hidden" name="status" value={filter.key} />
            <input name="q" defaultValue={query} placeholder="Search card or set…" className="input" />
          </form>
        </div>

        {wants.length === 0 ? (
          <div className="panel p-10 text-center text-ink-muted">No posts match.</div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wants.map((w) => (
              <li key={w.id}>
                <WantCard want={w} offers={offersFor(w.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A post in the browse grid. `footer` replaces the default offer summary; `tag` sits by the status. */
function WantCard({
  want: w,
  offers,
  tag,
  footer,
}: {
  want: Want;
  offers: OfferRow[];
  tag?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const lowest = offers.length ? Math.min(...offers.map(offerTotal)) : undefined;
  return (
    <Link href={`/wants/${w.id}`} className="panel flex h-full gap-4 p-4 transition-shadow hover:shadow-md">
      <div className="w-24 shrink-0">
        <CardArt want={w} size="low" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={w.status} />
          <span className="text-xs text-ink-muted">{w.scope === "local" ? `Local · ${w.state}` : "Nationwide"}</span>
          {tag}
        </div>
        <div>
          <h3 className="truncate font-semibold">{w.cardName}</h3>
          <p className="truncate text-sm text-ink-muted">
            {w.setName}
            {w.cardNumber && ` · ${w.cardNumber}`}
          </p>
        </div>
        <p className="text-sm">{conditionLabel(w.condition)}</p>
        <p className="text-sm text-ink-muted">
          Budget {money(w.priceMin)}–{money(w.priceMax)}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-2 text-sm">
          <span>
            {footer ??
              (lowest !== undefined ? (
                <>
                  <span className="font-semibold text-open">{money(lowest)}</span>{" "}
                  <span className="text-ink-muted">low · {offers.length} offers</span>
                </>
              ) : (
                <span className="text-ink-muted">No offers yet</span>
              ))}
          </span>
          {w.status === "open" && <span className="text-xs text-ink-muted">{timeLeft(w.expiresAt)}</span>}
        </div>
      </div>
    </Link>
  );
}
