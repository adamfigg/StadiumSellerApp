import { setViewMode } from "@/app/actions";
import type { ViewMode } from "@/lib/view-mode";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "buying", label: "Buying" },
  { value: "selling", label: "Selling" },
];

/** Header switch between the Buying and Selling views. Only rendered for users with a seller profile. */
export function ModeToggle({ mode }: { mode: ViewMode }) {
  return (
    <form action={setViewMode} className="flex rounded-lg border border-line bg-surface-2 p-0.5" aria-label="View the site as">
      {MODES.map((m) => {
        const active = m.value === mode;
        return (
          <button
            key={m.value}
            name="mode"
            value={m.value}
            aria-pressed={active}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? m.value === "selling"
                  ? "bg-open text-surface shadow-sm"
                  : "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </form>
  );
}
