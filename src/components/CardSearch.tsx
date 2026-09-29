"use client";

import { useEffect, useState } from "react";
import { ZoomImage } from "./ZoomImage";

export interface PickedCard {
  id: string;
  name: string;
  number: string;
  setName: string;
  image: string;
  rarity?: string;
  illustrator?: string;
  marketPrice?: number;
}

type Summary = Omit<PickedCard, "rarity" | "illustrator" | "marketPrice">;

/** Searches TCGdex through our /api/cards routes and hands the chosen card back. */
export function CardSearch({ onPick }: { onPick: (card: PickedCard) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Summary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [picking, setPicking] = useState<string>();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        setResults(await res.json());
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  async function pick(card: Summary) {
    setPicking(card.id);
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(card.id)}`);
      onPick(res.ok ? await res.json() : card);
    } catch {
      onPick(card);
    } finally {
      setPicking(undefined);
    }
  }

  const q = query.trim();

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) setResults([]);
        }}
        placeholder="Search by Pokémon or card name, e.g. Umbreon VMAX"
        className="input"
        aria-label="Search cards"
      />
      {status === "error" && (
        <p className="text-sm text-danger">Card search is unavailable. You can still fill in the details by hand.</p>
      )}
      {q.length >= 2 && status === "idle" && results.length === 0 && (
        <p className="text-sm text-ink-muted">No cards found for “{q}”.</p>
      )}
      {results.length > 0 && (
        <ul className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-4 md:grid-cols-6">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                disabled={!!picking}
                className="group w-full text-left disabled:opacity-60"
              >
                <ZoomImage
                  src={`${c.image}/low.webp`}
                  zoomSrc={`${c.image}/high.webp`}
                  alt={`${c.name} ${c.setName} ${c.number}`}
                  loading="lazy"
                  className={`aspect-[5/7] w-full rounded-md object-cover shadow-sm transition group-hover:ring-2 group-hover:ring-brand ${
                    picking === c.id ? "animate-pulse" : ""
                  }`}
                />
                <span className="mt-1 block truncate text-xs font-medium">{c.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {c.setName} · {c.number}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {status === "loading" && <p className="text-sm text-ink-muted">Searching…</p>}
    </div>
  );
}
