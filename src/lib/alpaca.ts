import type { ChartBar } from "./types";
import { toAlpacaTimeframe } from "./timeframe";

const DEFAULT_DATA_URL = "https://data.alpaca.markets";

export type FetchBarsParams = {
  symbol: string;
  timeframe: string;
  limit?: number;
  feed?: "iex" | "sip";
  start?: string;
  end?: string;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing env ${name}. Set it in .env.local or Vercel project settings.`);
  }
  return v;
}

function getCredentials() {
  return {
    key: requireEnv("ALPACA_API_KEY"),
    secret: requireEnv("ALPACA_SECRET_KEY"),
    base: (process.env.ALPACA_DATA_URL?.trim() || DEFAULT_DATA_URL).replace(/\/$/, ""),
  };
}

type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  n?: number;
  vw?: number;
};

function mapBar(b: AlpacaBar): ChartBar {
  return {
    time: new Date(b.t).getTime(),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
  };
}

/**
 * Fetch stock bars from Alpaca Market Data REST.
 * MVP uses feed=iex (free-tier friendly). Keys never leave the server.
 */
export async function fetchAlpacaBars(params: FetchBarsParams): Promise<{
  symbol: string;
  timeframe: string;
  feed: string;
  bars: ChartBar[];
}> {
  const { key, secret, base } = getCredentials();
  const symbol = params.symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol)) {
    throw new Error(`Invalid symbol: ${params.symbol}`);
  }

  const timeframe = toAlpacaTimeframe(params.timeframe);
  const feed = params.feed ?? "iex";
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 10000);

  const url = new URL(`${base}/v2/stocks/${encodeURIComponent(symbol)}/bars`);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("feed", feed);
  url.searchParams.set("adjustment", "split");
  url.searchParams.set("sort", "asc");
  if (params.start) url.searchParams.set("start", params.start);
  if (params.end) url.searchParams.set("end", params.end);

  const res = await fetch(url.toString(), {
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      Accept: "application/json",
    },
    // Server-side only; avoid Next caching stale minutes into the edge.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Alpaca ${res.status}: ${body.slice(0, 400) || res.statusText}`);
  }

  const json = (await res.json()) as { bars?: AlpacaBar[] | null; symbol?: string };
  const raw = json.bars ?? [];
  const bars = raw.map(mapBar).sort((a, b) => a.time - b.time);

  // De-dupe by open time.
  const deduped: ChartBar[] = [];
  for (const bar of bars) {
    const last = deduped[deduped.length - 1];
    if (last && last.time === bar.time) {
      deduped[deduped.length - 1] = bar;
    } else {
      deduped.push(bar);
    }
  }

  return { symbol, timeframe, feed, bars: deduped };
}
