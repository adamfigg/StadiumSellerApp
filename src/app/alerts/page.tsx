import Link from "next/link";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { conditionLabel, money, timeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { updateInterests } from "@/app/actions";

export default async function AlertsPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);

  if (user.role !== "seller") {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center text-ink-muted">
        Alerts are for seller accounts. Switch to a seller in the header.
      </div>
    );
  }

  const alerts = db.alerts
    .filter((a) => a.sellerId === user.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="mt-1 mb-6 text-ink-muted">New wants that match what you sell.</p>
        {alerts.length === 0 ? (
          <div className="panel p-8 text-center text-ink-muted">
            No alerts yet. When a buyer posts a matching want, it lands here.
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => {
              const want = db.wants.find((w) => w.id === a.wantId);
              if (!want) return null;
              return (
                <li key={a.id}>
                  <Link
                    href={`/wants/${want.id}`}
                    className="panel flex flex-wrap items-center gap-3 p-4 hover:shadow-md"
                  >
                    {!a.read && <span className="size-2 rounded-full bg-brand" aria-label="New" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {want.cardName} <span className="text-ink-muted">· {want.setName}</span>
                      </div>
                      <div className="text-sm text-ink-muted">
                        {conditionLabel(want.condition)} · budget {money(want.priceMin)}–
                        {money(want.priceMax)} · matched “{a.matchedOn}” · {timeAgo(a.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={want.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside>
        <form action={updateInterests} className="panel space-y-3 p-5">
          <h2 className="font-semibold">What you sell</h2>
          <p className="text-sm text-ink-muted">
            Comma-separated keywords. A new want alerts you when its card name or set contains one.
            Local-preferred wants only alert sellers in the buyer&apos;s state.
          </p>
          <textarea
            name="interests"
            rows={4}
            defaultValue={(user.interests ?? []).join(", ")}
            className="input"
          />
          <button className="btn-primary">Save</button>
        </form>
      </aside>
    </div>
  );
}
