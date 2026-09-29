import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { db, expireWants } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { conditionLabel, money, timeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { updateInterests } from "@/app/actions";

export default async function AlertsPage() {
  const user = await requireUser("/alerts");

  if (!user.seller) {
    return (
      <div className="panel mx-auto max-w-lg space-y-3 p-8 text-center">
        <h1 className="text-xl font-semibold">Alerts are for sellers</h1>
        <p className="text-ink-muted">
          Set up your seller profile to get alerted when buyers post the cards you sell.
        </p>
        <Link href="/seller/setup?next=/alerts" className="btn-primary">
          Set up seller profile
        </Link>
      </div>
    );
  }

  await expireWants();
  const alerts = await db
    .select({ alert: s.alert, want: s.want })
    .from(s.alert)
    .innerJoin(s.want, eq(s.want.id, s.alert.wantId))
    .where(eq(s.alert.sellerId, user.id))
    .orderBy(desc(s.alert.createdAt));

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
            {alerts.map(({ alert: a, want }) => (
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
            ))}
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
          <textarea name="interests" rows={4} defaultValue={user.seller.interests.join(", ")} className="input" />
          <button className="btn-primary">Save</button>
        </form>
      </aside>
    </div>
  );
}
