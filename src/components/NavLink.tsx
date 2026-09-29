"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header tab: highlighted while you're on its page (or a page under it). */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors ${
        active ? "bg-surface-2 font-medium text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
