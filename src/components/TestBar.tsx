"use client";

import { demoSignIn, testSignUp } from "@/app/actions";

type DemoUser = { id: string; label: string; seller: boolean };

/** Dev-only strip above the header: start a fresh sign-up, or jump between seeded demo accounts. */
export function TestBar({ demoUsers, currentId }: { demoUsers: DemoUser[]; currentId?: string }) {
  const isDemo = demoUsers.some((u) => u.id === currentId);
  return (
    <div className="border-b border-dashed border-pending/40 bg-pending-soft text-pending">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-xs">
        <span className="font-semibold uppercase tracking-wider">Test tools</span>
        <form action={testSignUp}>
          <button className="rounded-md border border-pending/40 bg-surface px-2.5 py-1 font-medium text-ink hover:bg-surface-2">
            Test sign up
          </button>
        </form>
        <form action={demoSignIn} className="ml-auto flex items-center gap-2">
          <label htmlFor="demoUser">Viewing as</label>
          <select
            id="demoUser"
            name="userId"
            key={currentId ?? "visitor"}
            defaultValue={isDemo ? currentId : currentId ? "__self" : ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-md border border-pending/40 bg-surface px-2 py-1 text-ink"
          >
            <option value="">Visitor (signed out)</option>
            {currentId && !isDemo && (
              <option value="__self" disabled>
                Your test account
              </option>
            )}
            <optgroup label="Demo users">
              {demoUsers.filter((u) => !u.seller).map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </optgroup>
            <optgroup label="Demo users with seller profiles">
              {demoUsers.filter((u) => u.seller).map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </optgroup>
          </select>
        </form>
      </div>
    </div>
  );
}
