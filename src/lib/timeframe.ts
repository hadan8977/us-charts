import type { UiTimeframe } from "./types";

/** Map UI / Alpaca timeframe ↔ Vela timeframe tokens. */
export function toVelaTimeframe(tf: UiTimeframe): string {
  return tf === "1Min" ? "1" : "D";
}

export function fromVelaTimeframe(tf: string): UiTimeframe {
  if (tf === "1" || tf === "1Min" || tf === "1m") return "1Min";
  return "1Day";
}

/** Map any query/Vela token to an Alpaca REST timeframe. */
export function toAlpacaTimeframe(tf: string): string {
  const t = tf.trim();
  const map: Record<string, string> = {
    "1": "1Min",
    "1m": "1Min",
    "1Min": "1Min",
    "5": "5Min",
    "5Min": "5Min",
    "15": "15Min",
    "15Min": "15Min",
    "60": "1Hour",
    "1h": "1Hour",
    "1H": "1Hour",
    "1Hour": "1Hour",
    D: "1Day",
    "1D": "1Day",
    "1Day": "1Day",
    Day: "1Day",
  };
  return map[t] ?? t;
}

export function isMinuteLike(tf: string): boolean {
  const a = toAlpacaTimeframe(tf);
  return a.endsWith("Min") || a === "1Min";
}
