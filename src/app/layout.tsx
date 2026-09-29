import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, count, eq, inArray } from "drizzle-orm";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import * as s from "@/db/schema";
import { db } from "@/lib/db";
import { DEMO_USERS } from "@/lib/seed";
import { getCurrentUser, TEST_TOOLS } from "@/lib/session";
import { displayName } from "@/lib/format";
import { signOut } from "@/app/actions";
import { getViewMode } from "@/lib/view-mode";
import { HISTORY_COOKIE, parseHistoryPrefs } from "@/lib/history-prefs";
import { ModeToggle } from "@/components/ModeToggle";
import { NavLink } from "@/components/NavLink";
import { HistoryShell, HistoryToggle } from "@/components/RecentHistory";
import { SignUpGate } from "@/components/SignUpGate";
import { TestBar } from "@/components/TestBar";
import type { User } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stadium — buyers post, sellers compete",
  description: "A buyer-first marketplace for Pokémon cards with fully public seller offers.",
};

async function demoAccounts() {
  const rows = await db
    .select({ id: s.user.id, name: s.user.name, seller: s.sellerProfile })
    .from(s.user)
    .leftJoin(s.sellerProfile, eq(s.sellerProfile.userId, s.user.id))
    .where(inArray(s.user.id, DEMO_USERS.map((u) => u.id)));
  const order = DEMO_USERS.map((u) => u.id);
  rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return rows.map((r) => ({
    id: r.id,
    seller: !!r.seller,
    label: r.seller ? `${displayName(r)}${r.seller.sellerType === "company" ? " (shop)" : ""}` : r.name,
  }));
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const [unread, demoUsers, mode, cookieStore] = await Promise.all([
    user?.seller
      ? db
          .select({ n: count() })
          .from(s.alert)
          .where(and(eq(s.alert.sellerId, user.id), eq(s.alert.read, false)))
          .then(([r]) => r.n)
      : 0,
    TEST_TOOLS ? demoAccounts() : [],
    getViewMode(user),
    cookies(),
  ]);
  const historyPrefs = parseHistoryPrefs(cookieStore.get(HISTORY_COOKIE)?.value);

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <HistoryShell userKey={user?.id ?? "visitor"} initialPrefs={historyPrefs}>
          {TEST_TOOLS && <TestBar demoUsers={demoUsers} currentId={user?.id} />}
          <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="grid size-7 place-items-center rounded-md bg-brand text-sm text-brand-ink">
                  S
                </span>
                Stadium
              </Link>
              <nav className="flex flex-wrap items-center gap-1 text-sm">
                <NavLink href="/">Browse wants</NavLink>
                {user ? (
                  <NavLink href="/wants/new">Post a want</NavLink>
                ) : (
                  <SignUpGate next="/wants/new">
                    <Link href="/wants/new" className="rounded-md px-2 py-1 text-ink-muted hover:text-ink">
                      Post a want
                    </Link>
                  </SignUpGate>
                )}
                {user && <NavLink href="/my/wants">My wants</NavLink>}
                {user?.seller && <NavLink href="/my/offers">My offers</NavLink>}
                {user?.seller && (
                  <NavLink href="/alerts">
                    Alerts
                    {unread > 0 && (
                      <span className="rounded-full bg-brand px-1.5 text-xs font-medium text-brand-ink">
                        {unread}
                      </span>
                    )}
                  </NavLink>
                )}
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <HistoryToggle />
                {user ? (
                  <>
                    {user.seller && <ModeToggle mode={mode} />}
                    <AccountMenu user={user} />
                  </>
                ) : (
                  <>
                    <Link href="/signin" className="btn-secondary">
                      Sign in
                    </Link>
                    <Link href="/signup" className="btn-primary">
                      Sign up free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
            Stadium · base version · demo data
          </footer>
        </HistoryShell>
      </body>
    </html>
  );
}

function AccountMenu({ user }: { user: User }) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm hover:bg-surface-2">
        <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-40 truncate">{displayName(user)}</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-line bg-surface p-2 text-sm shadow-lg">
        <div className="px-2 py-1.5">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs text-ink-muted">{user.email}</div>
          <div className="mt-1 text-xs text-ink-muted">
            {user.seller ? "Buyer + seller" : "Buyer"} · {user.city}, {user.state}
          </div>
        </div>
        <hr className="my-1 border-line" />
        <Link href="/my/wants" className="block rounded-md px-2 py-1.5 hover:bg-surface-2">
          My wants
        </Link>
        {user.seller && (
          <Link href="/my/offers" className="block rounded-md px-2 py-1.5 hover:bg-surface-2">
            My offers
          </Link>
        )}
        {user.seller ? (
          <Link href="/seller/setup" className="block rounded-md px-2 py-1.5 hover:bg-surface-2">
            Seller profile
          </Link>
        ) : (
          <Link href="/seller/setup" className="block rounded-md px-2 py-1.5 font-medium text-brand hover:bg-brand-soft">
            Start selling
          </Link>
        )}
        <form action={signOut}>
          <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-2">Sign out</button>
        </form>
      </div>
    </details>
  );
}
