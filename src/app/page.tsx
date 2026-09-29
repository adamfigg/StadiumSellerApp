import Link from "next/link";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { conditionLabel, money, offerTotal, timeLeft } from "@/lib/format";
import { CardArt, StatusBadge } from "@/components/ui";
import type { WantStatus } from "@/lib/types";

const FILTERS: { key: string; label: string; statuses: WantStatus[] }[] = [
  { key: "open", label: "Open", statuses: ["open"] },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "closed", label: "Closed", statuses: ["sold", "no_deal"] },
  { key: "all", label: "All", statuses: ["open", "pending", "sold", "no_deal"] },
];

export default async function BrowsePage({ searchParams }: PageProps<"/">) {
  const { status = "open", q = "", mine } = await searchParams;
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);

  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const query = String(q).toLowerCase().trim();
  const onlyMine = mine === "1" && user.role === "buyer";

  const wants = db.wants
    .filter((w) => filter.statuses.includes(w.status))
    .filter((w) => !onlyMine || w.buyerId === user.id)
    .filter(
      (w) => !query || `${w.cardName} ${w.setName} ${w.cardNumber ?? ""}`.toLowerCase().includes(query),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const href = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: filter.key, q: query || undefined, mine: onlyMine ? "1" : undefined, ...next };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/?${p}`;
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Buyers post. Sellers compete.</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Every want is public, and so is every offer on it. Sellers see what they need to beat,
            and buyers pick the deal they like.
          </p>
        </div>
        {user.role === "buyer" && (
          <Link href="/wants/new" className="btn-primary shrink-0">
            Post a want
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        {user.role === "buyer" && (
          <Link
            href={href({ mine: onlyMine ? undefined : "1" })}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              onlyMine ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-muted"
            }`}
          >
            My posts
          </Link>
        )}
        <form className="sm:ml-auto sm:w-72">
          <input type="hidden" name="status" value={filter.key} />
          {onlyMine && <input type="hidden" name="mine" value="1" />}
          <input name="q" defaultValue={query} placeholder="Search card or set…" className="input" />
        </form>
      </section>

      {wants.length === 0 ? (
        <div className="panel p-10 text-center text-ink-muted">No posts match.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wants.map((w) => {
            const offers = db.offers.filter((o) => o.wantId === w.id && !o.supersededAt);
            const lowest = offers.length ? Math.min(...offers.map(offerTotal)) : undefined;
            return (
              <li key={w.id}>
                <Link
                  href={`/wants/${w.id}`}
                  className="panel flex h-full gap-4 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="w-24 shrink-0">
                    <CardArt want={w} size="low" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={w.status} />
                      <span className="text-xs text-ink-muted">
                        {w.scope === "local" ? `Local · ${w.location.state}` : "Nationwide"}
                      </span>
                    </div>
                    <div>
                      <h2 className="truncate font-semibold">{w.cardName}</h2>
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
                        {lowest !== undefined ? (
                          <>
                            <span className="font-semibold text-open">{money(lowest)}</span>{" "}
                            <span className="text-ink-muted">low · {offers.length} offers</span>
                          </>
                        ) : (
                          <span className="text-ink-muted">No offers yet</span>
                        )}
                      </span>
                      {w.status === "open" && (
                        <span className="text-xs text-ink-muted">{timeLeft(w.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
