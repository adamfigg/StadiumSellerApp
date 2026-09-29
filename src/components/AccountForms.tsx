"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { setupSeller, signIn, signUp } from "@/app/actions";
import { US_STATES } from "@/lib/states";
import type { SellerType } from "@/lib/types";

function ErrorText({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
      {error}
    </p>
  ) : null;
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" required autoComplete="name" className="input" placeholder="Ash Ketchum" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
        <p className="mt-1 text-xs text-ink-muted">At least 8 characters.</p>
      </div>
      <fieldset>
        <legend className="label">Where you are</legend>
        <div className="grid grid-cols-[1fr_9rem] gap-3">
          <input name="city" required autoComplete="address-level2" className="input" placeholder="City" aria-label="City" />
          <select name="state" required defaultValue="" autoComplete="address-level1" className="input" aria-label="State">
            <option value="" disabled>State</option>
            {US_STATES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Lets you ask for local sellers first. Only your city and state are shown on your posts.
        </p>
      </fieldset>
      <ErrorText error={state?.error} />
      <button className="btn-primary w-full py-2.5" disabled={pending}>
        {pending ? "Creating your account…" : "Create my free account"}
      </button>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"} className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <ErrorText error={state?.error} />
      <button className="btn-primary w-full py-2.5" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-muted">
        New to Stadium?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-brand hover:underline">
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export function SellerSetupForm({
  next,
  initial,
  skipHref,
}: {
  next?: string;
  initial?: { sellerType: SellerType; businessName: string | null; interests: string[] };
  /** Shown during onboarding so the new user can opt out. */
  skipHref?: string;
}) {
  const [state, action, pending] = useActionState(setupSeller, undefined);
  const [type, setType] = useState<SellerType>(initial?.sellerType ?? "individual");
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="sellerType" value={type} />
      <fieldset>
        <legend className="label">I sell as</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["individual", "An individual collector", "Selling from your own collection."],
              ["company", "A shop or business", "Offers show your business name."],
            ] as const
          ).map(([value, title, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                type === value ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line bg-surface hover:bg-surface-2"
              }`}
            >
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {type === "company" && (
        <div>
          <label className="label" htmlFor="businessName">Business name</label>
          <input
            id="businessName"
            name="businessName"
            required
            defaultValue={initial?.businessName ?? ""}
            autoComplete="organization"
            className="input"
            placeholder="Card Vault SLC"
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor="interests">
          What do you sell? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="interests"
          name="interests"
          defaultValue={initial?.interests.join(", ") ?? ""}
          className="input"
          placeholder="charizard, evolving skies, 151"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Comma-separated keywords. You&apos;ll get an alert when a buyer posts a matching card.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-line bg-surface-2 p-3 text-xs text-ink-muted">
        <span className="font-medium text-ink">Identity and payouts:</span> seller verification and payouts will run
        through Stripe. You&apos;ll be asked to verify before that goes live.
      </div>
      <ErrorText error={state?.error} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary py-2.5" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save seller profile" : "Create seller profile"}
        </button>
        {skipHref && (
          <Link href={skipHref} className="text-sm text-ink-muted hover:text-ink">
            Skip for now
          </Link>
        )}
      </div>
    </form>
  );
}
