import type { ChartBar } from "./types";
import { toAlpacaTimeframe } from "./timeframe";

const DEFAULT_DATA_URL = "https://data.alpaca.markets";
const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

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
 * Alpaca IEX often returns only the latest bar when `start` is omitted
 * (especially for 1Day). Derive a lookback window from timeframe + limit.
 */
export function defaultBarWindow(
  timeframe: string,
  limit: number,
  nowMs = Date.now(),
): { start: string; end: string } {
  const tf = toAlpacaTimeframe(timeframe);
  const end = new Date(nowMs).toISOString();
  let spanMs: number;

  if (tf.endsWith("Min")) {
    const mins = Number.parseInt(tf, 10) || 1;
    // US RTH ~390 mins; pad weekends/holidays so a "full session" still fills.
    const bars = Math.max(limit, 500);
    spanMs = bars * mins * MS_MIN * 3;
  } else if (tf.endsWith("Hour") || tf === "1Hour") {
    const hours = Number.parseInt(tf, 10) || 1;
    spanMs = Math.max(limit, 200) * hours * MS_HOUR * 2;
  } else if (tf === "1Week" || tf === "1Month") {
    spanMs = Math.max(limit, 52) * 8 * MS_DAY;
  } else {
    // Daily (+ anything else): calendar days ≈ 1.7× trading days, plus cushion.
    spanMs = Math.max(limit, 200) * 1.7 * MS_DAY;
  }

  // Cap lookback so free IEX stays within practical history (~2y).
  const maxSpan = 800 * MS_DAY;
  const startMs = nowMs - Math.min(spanMs, maxSpan);
  return { start: new Date(startMs).toISOString(), end };
}

function defaultLimitFor(timeframe: string, requested?: number): number {
  if (requested != null && Number.isFinite(requested)) {
    return Math.min(Math.max(requested, 1), 10000);
  }
  const tf = toAlpacaTimeframe(timeframe);
  if (tf.endsWith("Min")) return 500; // ~full RTH session
  return 200;
}

/**
 * Fetch stock bars from Alpaca Market Data REST.
 * MVP uses feed=iex (free-tier friendly). Keys never leave the server.
 *
 * Always sends start/end: without start, IEX 1Day often returns a single bar.
 * Uses sort=desc so `limit` yields the *most recent* bars, then re-sorts asc.
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
  const limit = defaultLimitFor(timeframe, params.limit);

  const defaults = defaultBarWindow(timeframe, limit);
  const start = params.start ?? defaults.start;
  const end = params.end ?? defaults.end;

  const url = new URL(`${base}/v2/stocks/${encodeURIComponent(symbol)}/bars`);
  url.searchParams.set("timeframe", timeframe);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("feed", feed);
  url.searchParams.set("adjustment", "split");
  // Newest-first so limit keeps recent history inside a wide start/end window.
  url.searchParams.set("sort", "desc");
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);

  const all: AlpacaBar[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 10; page++) {
    if (pageToken) url.searchParams.set("page_token", pageToken);
    else url.searchParams.delete("page_token");

    const res = await fetch(url.toString(), {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Alpaca ${res.status}: ${body.slice(0, 400) || res.statusText}`);
    }

    const json = (await res.json()) as {
      bars?: AlpacaBar[] | null;
      next_page_token?: string | null;
    };
    const chunk = json.bars ?? [];
    all.push(...chunk);
    pageToken = json.next_page_token || undefined;
    if (!pageToken || all.length >= limit) break;
  }

  const bars = all
    .slice(0, limit)
    .map(mapBar)
    .sort((a, b) => a.time - b.time);

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
