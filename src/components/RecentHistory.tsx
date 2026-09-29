"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WantSummary } from "@/app/api/wants/summary/route";
import { STATUS_LABEL } from "@/lib/format";
import { HISTORY_COOKIE, serializeHistoryPrefs, type Dock, type HistoryPrefs } from "@/lib/history-prefs";
import { ZoomImage } from "./ZoomImage";

/*
 * "Recently viewed": the last 20 posts this browser opened (per account), docked left, right or
 * bottom like browser dev tools, taking 20% of the screen. The page shrinks to make room; it is
 * never covered. Post ids live in localStorage; details are fetched fresh so status and offers
 * are current. Dock side and open/closed live in a cookie so the first render is already right.
 */

const MAX_ITEMS = 20;
const CHANGED = "stadium:recent-changed";

const storageKey = (userKey: string) => `stadium:recent:${userKey}`;

function readIds(userKey: string): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(userKey)) ?? "[]");
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(userKey: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(ids.slice(0, MAX_ITEMS)));
  } catch {
    // Storage blocked (private mode etc.): the panel just stays empty.
  }
  window.dispatchEvent(new Event(CHANGED));
}

type Ctx = { userKey: string; prefs: HistoryPrefs; setPrefs: (p: HistoryPrefs) => void };
const HistoryContext = createContext<Ctx | null>(null);

const useHistory = () => {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("RecentHistory components must be inside <HistoryShell>");
  return ctx;
};

/** Wraps the whole page. Adds room for the docked panel and renders it. */
export function HistoryShell({
  userKey,
  initialPrefs,
  children,
}: {
  userKey: string;
  initialPrefs: HistoryPrefs;
  children: React.ReactNode;
}) {
  const [prefs, setPrefsState] = useState(initialPrefs);
  const setPrefs = useCallback((p: HistoryPrefs) => {
    setPrefsState(p);
    document.cookie = `${HISTORY_COOKIE}=${serializeHistoryPrefs(p)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return (
    <HistoryContext.Provider value={{ userKey, prefs, setPrefs }}>
      <div className="history-shell" data-open={prefs.open} data-dock={prefs.dock}>
        {children}
      </div>
      {prefs.open && <HistoryPanel />}
    </HistoryContext.Provider>
  );
}

/** Header button that shows or hides the panel. */
export function HistoryToggle() {
  const { prefs, setPrefs } = useHistory();
  return (
    <button
      type="button"
      onClick={() => setPrefs({ ...prefs, open: !prefs.open })}
      aria-pressed={prefs.open}
      title={prefs.open ? "Hide recently viewed" : "Show recently viewed"}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
        prefs.open ? "border-ink/20 bg-surface-2 text-ink" : "border-line bg-surface text-ink-muted hover:text-ink"
      }`}
    >
      <ClockIcon />
      <span className="hidden sm:inline">History</span>
    </button>
  );
}

/**
 * Drop on a post page to add it to the top of the viewer's history. Pass a `version` that changes
 * with the post's offers/status so the panel refreshes after an offer is made on the same page.
 */
export function RecordView({ wantId, version }: { wantId: string; version?: string }) {
  const { userKey } = useHistory();
  useEffect(() => {
    writeIds(userKey, [wantId, ...readIds(userKey).filter((id) => id !== wantId)]);
  }, [userKey, wantId, version]);
  return null;
}

const DOCKS: { value: Dock; label: string }[] = [
  { value: "left", label: "Dock to left" },
  { value: "bottom", label: "Dock to bottom" },
  { value: "right", label: "Dock to right" },
];

function HistoryPanel() {
  const { userKey, prefs, setPrefs } = useHistory();
  const pathname = usePathname();
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<WantSummary[] | null>(null);
  const [tick, setTick] = useState(0);

  // Follow this account's list, including views recorded in other tabs. Every change also refetches.
  useEffect(() => {
    const sync = () => {
      setIds(readIds(userKey));
      setTick((n) => n + 1);
    };
    sync();
    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userKey]);

  // Refresh details when the list changes or the page changes (statuses and offers move).
  const idList = ids.join(",");
  useEffect(() => {
    if (!idList) return;
    const ctrl = new AbortController();
    fetch(`/api/wants/summary?ids=${encodeURIComponent(idList)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => ctrl.signal.aborted || setItems([]));
    return () => ctrl.abort();
  }, [idList, pathname, tick]);

  const shown = idList ? items : [];

  return (
    <aside className="history-panel" data-dock={prefs.dock} aria-label="Recently viewed posts">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line px-3 py-2">
        <ClockIcon />
        <h2 className="whitespace-nowrap text-sm font-semibold">Recently viewed</h2>
        {!!shown?.length && <span className="text-xs text-ink-muted">{shown.length}</span>}
        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-md border border-line bg-surface-2 p-0.5" role="group" aria-label="Dock side">
            {DOCKS.map((d) => (
              <button
                key={d.value}
                type="button"
                title={d.label}
                aria-label={d.label}
                aria-pressed={prefs.dock === d.value}
                onClick={() => setPrefs({ ...prefs, dock: d.value })}
                className={`grid size-6 place-items-center rounded ${
                  prefs.dock === d.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <DockIcon side={d.value} />
              </button>
            ))}
          </div>
          {!!shown?.length && (
            <button
              type="button"
              onClick={() => writeIds(userKey, [])}
              className="rounded px-1.5 py-0.5 text-xs text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setPrefs({ ...prefs, open: false })}
            aria-label="Hide recently viewed"
            title="Hide"
            className="grid size-6 place-items-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {shown === null ? (
        <p className="p-4 text-sm text-ink-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">Posts you open show up here, newest first.</p>
      ) : (
        <ol className="history-list">
          {shown.map((w) => {
            const current = pathname === `/wants/${w.id}`;
            return (
              <li key={w.id} className="history-item">
                <Link
                  href={`/wants/${w.id}`}
                  aria-current={current ? "page" : undefined}
                  title={w.mineIsBest ? "Your offer is the lowest on this post" : undefined}
                  className={`flex h-full gap-3 rounded-lg border p-2 transition-colors ${
                    w.mineIsBest
                      ? "history-mine-best border-gold bg-gold-soft hover:brightness-[1.02]"
                      : current
                        ? "border-brand bg-brand-soft"
                        : "border-line bg-surface hover:bg-surface-2"
                  } ${current && w.mineIsBest ? "outline-2 outline-offset-1 outline-brand" : ""}`}
                >
                  <div className="w-12 shrink-0">
                    {w.officialImage ? (
                      <ZoomImage
                        src={`${w.officialImage}/low.webp`}
                        zoomSrc={`${w.officialImage}/high.webp`}
                        alt={w.cardName}
                        loading="lazy"
                        className="aspect-[5/7] w-full rounded object-cover shadow-sm"
                      />
                    ) : (
                      <div className="grid aspect-[5/7] w-full place-items-center rounded border border-line bg-surface-2 text-[9px] text-ink-muted">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                    <div className="truncate text-sm font-medium" title={`${w.cardName} · ${w.setName}`}>
                      {w.cardName}
                    </div>
                    <div className={`truncate font-medium ${STATUS_TEXT[w.status]}`}>{STATUS_LABEL[w.status]}</div>
                    <div className="truncate text-ink-muted">
                      Budget {usd(w.priceMin)}–{usd(w.priceMax)}
                    </div>
                    {w.mineIsBest && (
                      <div className="flex items-center gap-1 truncate font-semibold text-gold-ink">
                        <CrownIcon /> Your offer is lowest
                      </div>
                    )}
                    <div className="truncate">
                      {w.lowestOffer !== null ? (
                        <>
                          Lowest <span className="font-semibold text-open">{usd(w.lowestOffer)}</span>
                          <span className="text-ink-muted"> · {w.offerCount} {w.offerCount === 1 ? "offer" : "offers"}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">No offers yet</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

const STATUS_TEXT: Record<WantSummary["status"], string> = {
  open: "text-open",
  pending: "text-pending",
  sold: "text-ink-muted",
  no_deal: "text-ink-muted",
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 === 0 ? 0 : 2 });

function CrownIcon() {
  return (
    <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
      <path d="M1 9.5h10L10 3 7.5 5.5 6 1.5 4.5 5.5 2 3z" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75V8l2.25 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** A window outline with the docked side filled in, like browser dev tools. */
function DockIcon({ side }: { side: Dock }) {
  const fill = { left: { x: 2, y: 2, w: 4, h: 12 }, right: { x: 10, y: 2, w: 4, h: 12 }, bottom: { x: 2, y: 10, w: 12, h: 4 } }[side];
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x={fill.x} y={fill.y} width={fill.w} height={fill.h} rx="0.75" fill="currentColor" />
    </svg>
  );
}
