"use client";

import { useActionState, useState } from "react";
import { createWant } from "@/app/actions";
import { GRADING_COMPANIES, RAW_CONDITIONS } from "@/lib/types";
import { CardSearch, type PickedCard } from "./CardSearch";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function WantForm({ location }: { location: string }) {
  const [state, action, pending] = useActionState(createWant, undefined);
  const [kind, setKind] = useState<"raw" | "graded">("raw");
  const [preview, setPreview] = useState<string>();
  const [card, setCard] = useState<PickedCard>();
  const [fields, setFields] = useState({ cardName: "", setName: "", cardNumber: "" });
  const field = (key: keyof typeof fields) => ({
    value: fields[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [key]: e.target.value }),
  });

  function pickCard(c: PickedCard) {
    setCard(c);
    setFields({ cardName: c.name, setName: c.setName, cardNumber: c.number });
  }

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[1fr_220px]">
      <div className="space-y-5">
        <input type="hidden" name="tcgCardId" value={card?.id ?? ""} />
        <section className="panel space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Find the card</h2>
            <span className="text-xs text-ink-muted">Card data from TCGdex</span>
          </div>
          {card ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- TCGdex CDN */}
              <img src={`${card.image}/low.webp`} alt={card.name} className="w-16 rounded-md shadow-sm" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-medium">{card.name}</div>
                <div className="text-ink-muted">
                  {card.setName} · {card.number}
                  {card.rarity && ` · ${card.rarity}`}
                </div>
                {card.marketPrice !== undefined && (
                  <div className="mt-1">
                    TCGplayer market (ungraded): <span className="font-medium">{usd(card.marketPrice)}</span>
                  </div>
                )}
              </div>
              <button type="button" className="btn-secondary" onClick={() => setCard(undefined)}>
                Change
              </button>
            </div>
          ) : (
            <CardSearch onPick={pickCard} />
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cardName">Card name</label>
            <input id="cardName" name="cardName" required {...field("cardName")} className="input" placeholder="Umbreon VMAX (Alt Art)" />
          </div>
          <div>
            <label className="label" htmlFor="setName">Set</label>
            <input id="setName" name="setName" required {...field("setName")} className="input" placeholder="Evolving Skies" />
          </div>
          <div>
            <label className="label" htmlFor="cardNumber">
              Card number <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input id="cardNumber" name="cardNumber" {...field("cardNumber")} className="input" placeholder="215/203" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Quality</legend>
          <input type="hidden" name="conditionKind" value={kind} />
          <div className="mb-3 inline-flex rounded-lg border border-line bg-surface p-1">
            {(["raw", "graded"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md px-3 py-1 text-sm ${kind === k ? "bg-ink text-surface" : "text-ink-muted"}`}
              >
                {k === "raw" ? "Raw (ungraded)" : "Graded / slabbed"}
              </button>
            ))}
          </div>
          {kind === "raw" ? (
            <select name="rawCondition" className="input" defaultValue="Near Mint">
              {RAW_CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <select name="company" className="input" defaultValue="PSA" aria-label="Grading company">
                {GRADING_COMPANIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input name="grade" className="input" placeholder="Grade, e.g. 10 or 9.5" aria-label="Grade" />
            </div>
          )}
        </fieldset>

        <div>
          <span className="label">Price range</span>
          <div className="grid grid-cols-2 gap-4">
            <input name="priceMin" type="number" min={0} step="0.01" required className="input" placeholder="Min $" aria-label="Minimum price" />
            <input name="priceMax" type="number" min={1} step="0.01" required className="input" placeholder="Max $" aria-label="Maximum price" />
          </div>
          {card?.marketPrice !== undefined && (
            <p className="mt-1 text-xs text-ink-muted">
              Ungraded market is about {usd(card.marketPrice)}. Graded copies usually sell higher.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="input"
            placeholder="Anything sellers should know: centering, variants, deadline…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="label">Who can sell to you</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="scope" value="nationwide" defaultChecked /> Nationwide (shipping)
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="radio" name="scope" value="local" /> Local preferred · {location}
            </label>
          </fieldset>
          <div>
            <label className="label" htmlFor="days">Keep post open for</label>
            <select id="days" name="days" defaultValue="3" className="input">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
              <option value="7">7 days</option>
            </select>
          </div>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post want"}
        </button>
      </div>

      <div>
        <span className="label">Photo</span>
        {card && !preview && (
          <p className="mb-2 text-xs text-ink-muted">Official image. Click to add your own photo too.</p>
        )}
        <label className="flex aspect-[5/7] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-surface text-center text-sm text-ink-muted hover:border-brand">
          {preview || card ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL or TCGdex image
            <img src={preview ?? `${card!.image}/high.webp`} alt="Selected card" className="h-full w-full object-cover" />
          ) : (
            <span className="px-4">Add a reference photo (JPG, PNG, WebP · 5 MB)</span>
          )}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : undefined);
            }}
          />
        </label>
      </div>
    </form>
  );
}
