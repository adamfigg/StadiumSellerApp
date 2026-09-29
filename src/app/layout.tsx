import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { UserSwitcher } from "@/components/UserSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stadium — buyers post, sellers compete",
  description: "A buyer-first marketplace for Pokémon cards with fully public seller offers.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const unread = db.alerts.filter((a) => a.sellerId === user.id && !a.read).length;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-md bg-brand text-sm text-brand-ink">
                S
              </span>
              Stadium
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-ink-muted hover:text-ink">
                Browse wants
              </Link>
              {user.role === "buyer" ? (
                <Link href="/wants/new" className="text-ink-muted hover:text-ink">
                  Post a want
                </Link>
              ) : (
                <Link href="/alerts" className="flex items-center gap-1.5 text-ink-muted hover:text-ink">
                  Alerts
                  {unread > 0 && (
                    <span className="rounded-full bg-brand px-1.5 text-xs font-medium text-brand-ink">
                      {unread}
                    </span>
                  )}
                </Link>
              )}
            </nav>
            <div className="ml-auto">
              <UserSwitcher users={db.users} currentId={user.id} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
          Stadium · base version · demo data
        </footer>
      </body>
    </html>
  );
}
