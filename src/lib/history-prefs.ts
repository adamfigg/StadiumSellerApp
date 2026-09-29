/** Recently-viewed panel settings, kept in a cookie so the server renders the right layout on first paint. */
export type Dock = "left" | "right" | "bottom";
export type HistoryPrefs = { open: boolean; dock: Dock };

export const HISTORY_COOKIE = "stadium_history";
export const DEFAULT_HISTORY_PREFS: HistoryPrefs = { open: true, dock: "right" };

/** Cookie format: `open.right`, `closed.bottom`, … */
export function parseHistoryPrefs(value: string | undefined): HistoryPrefs {
  const [state, dock] = (value ?? "").split(".");
  return {
    open: state ? state === "open" : DEFAULT_HISTORY_PREFS.open,
    dock: dock === "left" || dock === "right" || dock === "bottom" ? dock : DEFAULT_HISTORY_PREFS.dock,
  };
}

export const serializeHistoryPrefs = (p: HistoryPrefs) => `${p.open ? "open" : "closed"}.${p.dock}`;
