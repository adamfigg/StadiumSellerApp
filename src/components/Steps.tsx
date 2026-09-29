const STEPS = ["Collector account", "Seller profile (optional)"];

/** Progress for the two-step sign-up. `current` is the 0-based active step. */
export function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Sign-up progress">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            {i > 0 && <span className="h-px w-6 bg-line" aria-hidden />}
            <span
              className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${
                state === "done"
                  ? "bg-open text-surface"
                  : state === "current"
                    ? "bg-brand text-brand-ink"
                    : "bg-surface-2 text-ink-muted"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className={state === "todo" ? "text-ink-muted" : "font-medium"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
