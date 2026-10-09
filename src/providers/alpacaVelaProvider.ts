import type { ChartBar } from "@/lib/types";
import { isMinuteLike, toAlpacaTimeframe } from "@/lib/timeframe";

type BarRange = {
  from?: number;
  to?: number;
  limit?: number;
  session?: string;
};

type SymbolDescriptor = {
  ticker: string;
  description?: string;
  type?: string;
  prefix?: string;
};

function defaultLimit(timeframe: string, requested?: number): number {
  if (requested != null && Number.isFinite(requested)) {
    return Math.min(Math.max(requested, 1), 10000);
  }
  return isMinuteLike(timeframe) ? 500 : 200;
}

/**
 * Vela DataProvider that pulls US equity bars from our Next.js /api/bars
 * (Alpaca IEX on the server). No Alpaca keys in the browser.
 *
 * Without subscribe(), Vela would poll getBars on its own schedule.
 * We implement subscribe() with a 5s interval for minute charts so near-realtime
 * works on Vercel serverless (no long-lived Alpaca WebSocket).
 */
export function createAlpacaVelaProvider(watchlist: string[] = ["AAPL"]) {
  const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  async function fetchBars(
    ticker: string,
    timeframe: string,
    range: BarRange,
  ): Promise<ChartBar[]> {
    const alpacaTf = toAlpacaTimeframe(timeframe);
    const limit = defaultLimit(timeframe, range.limit);
    const qs = new URLSearchParams({
      symbol: ticker,
      timeframe: alpacaTf,
      limit: String(limit),
      feed: "iex",
    });
    // Only forward an explicit from/to when the chart is paging history.
    // For the initial "most recent N bars" load, omit start/end so the
    // server applies its Alpaca-safe default window (IEX needs `start`).
    if (range.from != null) qs.set("start", new Date(range.from).toISOString());
    if (range.to != null) qs.set("end", new Date(range.to).toISOString());

    const res = await fetch(`/api/bars?${qs.toString()}`, { cache: "no-store" });
    const json = (await res.json()) as { bars?: ChartBar[]; error?: string };
    if (!res.ok) {
      throw new Error(json.error || `bars ${res.status}`);
    }
    return json.bars ?? [];
  }

  return {
    async getBars(ticker: string, timeframe: string, range: BarRange) {
      return fetchBars(ticker, timeframe, range);
    },

    async listSymbols(): Promise<SymbolDescriptor[]> {
      return watchlist.map((ticker) => ({
        ticker,
        description: ticker,
        type: "stock",
        prefix: "NASDAQ",
      }));
    },

    async getSymbolInfo(ticker: string) {
      return {
        ticker,
        currency: "USD",
        type: "stock",
        mintick: 0.01,
        session: "0930-1600",
        timezone: "America/New_York",
      };
    },

    /**
     * Poll /api/bars and emit the newest bar as the forming candle.
     * 5s for minute-like TFs; 60s for daily (still near-live enough for MVP).
     */
    subscribe(
      ticker: string,
      timeframe: string,
      onBar: (bar: ChartBar) => void,
    ): () => void {
      const key = `${ticker}|${timeframe}`;
      const existing = pollTimers.get(key);
      if (existing) clearInterval(existing);

      const intervalMs = isMinuteLike(timeframe) ? 5_000 : 60_000;

      const tick = async () => {
        try {
          const bars = await fetchBars(ticker, timeframe, { limit: 5 });
          const last = bars[bars.length - 1];
          if (last) onBar(last);
        } catch (err) {
          console.warn("[alpaca provider] poll failed", err);
        }
      };

      void tick();
      const id = setInterval(tick, intervalMs);
      pollTimers.set(key, id);

      return () => {
        clearInterval(id);
        pollTimers.delete(key);
      };
    },
  };
}
