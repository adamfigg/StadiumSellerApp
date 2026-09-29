"use client";

import { switchUser } from "@/app/actions";
import type { User } from "@/lib/types";

export function UserSwitcher({ users, currentId }: { users: User[]; currentId: string }) {
  const buyers = users.filter((u) => u.role === "buyer");
  const sellers = users.filter((u) => u.role === "seller");
  return (
    <form action={switchUser} className="flex items-center gap-2">
      <label htmlFor="userId" className="hidden text-xs text-ink-muted sm:block">
        Viewing as
      </label>
      <select
        id="userId"
        name="userId"
        defaultValue={currentId}
        key={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
      >
        <optgroup label="Buyers">
          {buyers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Sellers">
          {sellers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.businessName ?? u.name} {u.sellerType === "company" ? "(shop)" : ""}
            </option>
          ))}
        </optgroup>
      </select>
    </form>
  );
}
