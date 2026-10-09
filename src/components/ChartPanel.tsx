"use client";

import { useEffect, useRef, useState } from "react";
import type { UiTimeframe } from "@/lib/types";
import { toVelaTimeframe } from "@/lib/timeframe";
import { createAlpacaVelaProvider } from "@/providers/alpacaVelaProvider";

type Props = {
  symbol: string;
  timeframe: UiTimeframe;
  watchlist: string[];
};

/**
 * Client-only Vela chart. Keys stay on the server; provider hits /api/bars.
 */
export default function ChartPanel({ symbol, timeframe, watchlist }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [status, setStatus] = useState<string>("Loading chart…");
  const [error, setError] = useState<string | null>(null);

  // Mount once
  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!hostRef.current) return;
      try {
        const { Vela } = await import("@luxalgo/vela");
        if (cancelled || !hostRef.current) return;

        const provider = createAlpacaVelaProvider(watchlist);
        const chart = new Vela(hostRef.current, {
          symbol,
          timeframe: toVelaTimeframe(timeframe),
          theme: "dark",
          live: true,
          bars: 200,
        });
        chart.data.registerProvider("alpaca", provider);
        chartRef.current = chart;
        setStatus("Connecting…");

        await chart.ready();
        if (cancelled) {
          chart.destroy();
          return;
        }
        setStatus("Ready");
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(err);
        setError(msg);
        setStatus("Error");
      }
    }

    void mount();

    return () => {
      cancelled = true;
      try {
        chartRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
    };
    // Intentionally mount once; symbol/TF changes go through setMarket below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch market in place when symbol / timeframe changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    let cancelled = false;
    setStatus("Switching…");
    void (async () => {
      try {
        await chart.setMarket({
          symbol,
          timeframe: toVelaTimeframe(timeframe),
        });
        if (!cancelled) {
          setStatus("Ready");
          setError(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setError(msg);
          setStatus("Error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  return (
    <div className="chart-shell">
      <div className="chart-status" aria-live="polite">
        <span>{status}</span>
        {error ? <span className="chart-error"> · {error}</span> : null}
        <span className="chart-hint">
          {" "}
          · feed=iex · {timeframe === "1Min" ? "poll 5s" : "poll 60s"} ·{" "}
          <a href="https://velacharts.dev" target="_blank" rel="noreferrer">
            Vela™
          </a>
        </span>
      </div>
      <div ref={hostRef} className="chart-host" />
    </div>
  );
}
