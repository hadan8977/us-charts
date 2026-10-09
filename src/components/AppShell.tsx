"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { UiTimeframe } from "@/lib/types";
import { loadWatchlist, saveWatchlist } from "@/lib/watchlist";

const ChartPanel = dynamic(() => import("@/components/ChartPanel"), {
  ssr: false,
  loading: () => <div className="chart-placeholder">Loading chart library…</div>,
});

export default function AppShell() {
  const [symbol, setSymbol] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [timeframe, setTimeframe] = useState<UiTimeframe>("1Day");
  const [watchlist, setWatchlist] = useState<string[]>(["AAPL"]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const list = loadWatchlist();
    setWatchlist(list);
    setHydrated(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setWatchlist(next);
    saveWatchlist(next);
  }, []);

  function applySymbol(raw: string) {
    const s = raw.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)) return;
    setSymbol(s);
    setInput(s);
    if (!watchlist.includes(s)) {
      persist([...watchlist, s]);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    applySymbol(input);
  }

  function removeSymbol(s: string) {
    persist(watchlist.filter((x) => x !== s));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>US Charts</strong>
          <span className="muted">Alpaca IEX · Vela · Vercel-ready</span>
        </div>
        <form className="symbol-form" onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            aria-label="Symbol"
            placeholder="AAPL"
            spellCheck={false}
            maxLength={10}
          />
          <button type="submit">Go</button>
        </form>
        <div className="tf-toggle" role="group" aria-label="Timeframe">
          <button
            type="button"
            className={timeframe === "1Day" ? "active" : ""}
            onClick={() => setTimeframe("1Day")}
          >
            Day
          </button>
          <button
            type="button"
            className={timeframe === "1Min" ? "active" : ""}
            onClick={() => setTimeframe("1Min")}
          >
            1 Min
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-title">Watchlist</div>
          <p className="muted small">
            Stored in <code>localStorage</code> only (no server DB).
          </p>
          {!hydrated ? (
            <div className="muted small">Loading…</div>
          ) : (
            <ul className="watchlist">
              {watchlist.map((s) => (
                <li key={s} className={s === symbol ? "active" : ""}>
                  <button type="button" className="sym" onClick={() => applySymbol(s)}>
                    {s}
                  </button>
                  <button
                    type="button"
                    className="rm"
                    aria-label={`Remove ${s}`}
                    onClick={() => removeSymbol(s)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="chart-area">
          <ChartPanel symbol={symbol} timeframe={timeframe} watchlist={watchlist} />
        </section>
      </div>
    </div>
  );
}
