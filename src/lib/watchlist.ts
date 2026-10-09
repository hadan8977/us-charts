const STORAGE_KEY = "us-charts.watchlist.v1";
const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"];

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_WATCHLIST];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_WATCHLIST];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_WATCHLIST];
    const symbols = parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s));
    return symbols.length ? Array.from(new Set(symbols)) : [...DEFAULT_WATCHLIST];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

export function saveWatchlist(symbols: string[]): void {
  if (typeof window === "undefined") return;
  const cleaned = Array.from(
    new Set(
      symbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)),
    ),
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

export { DEFAULT_WATCHLIST };
