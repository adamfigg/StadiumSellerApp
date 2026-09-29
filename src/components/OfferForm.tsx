"use client";

import { useActionState, useState } from "react";
import { createOffer } from "@/app/actions";

export function OfferForm({
  wantId,
  lowestTotal,
  hasOffer,
}: {
  wantId: string;
  lowestTotal?: string;
  hasOffer: boolean;
}) {
  const [state, action, pending] = useActionState(createOffer, undefined);
  const [fulfillment, setFulfillment] = useState<"ship" | "local">("ship");

  return (
    <form action={action} className="panel space-y-4 p-5">
      <input type="hidden" name="wantId" value={wantId} />
      <div>
        <h2 className="font-semibold">{hasOffer ? "Revise your offer" : "Make an offer"}</h2>
        <p className="text-sm text-ink-muted">
          {lowestTotal
            ? `Lowest offer right now is ${lowestTotal} delivered. Everyone can see what you post.`
            : "No offers yet — set the bar. Everyone can see what you post."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="price">Price</label>
          <input id="price" name="price" type="number" min={1} step="0.01" required className="input" placeholder="$" />
        </div>
        <div>
          <label className="label" htmlFor="fulfillment">Delivery</label>
          <select
            id="fulfillment"
            name="fulfillment"
            className="input"
            value={fulfillment}
            onChange={(e) => setFulfillment(e.target.value as "ship" | "local")}
          >
            <option value="ship">Ship it</option>
            <option value="local">Local meetup</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="shipping">Shipping</label>
          <input
            id="shipping"
            name="shipping"
            type="number"
            min={0}
            step="0.01"
            disabled={fulfillment === "local"}
            className="input"
            placeholder={fulfillment === "local" ? "—" : "$0"}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="message">
          Message <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea id="message" name="message" rows={2} className="input" placeholder="Condition notes, turnaround…" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Posting…" : hasOffer ? "Post revised offer" : "Post public offer"}
      </button>
    </form>
  );
}
