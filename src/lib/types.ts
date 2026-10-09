/** Chart-ready OHLCV bar. `time` is bar open time in epoch milliseconds. */
export type ChartBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type UiTimeframe = "1Day" | "1Min";

export type BarsResponse = {
  symbol: string;
  timeframe: string;
  feed: string;
  bars: ChartBar[];
  source: "alpaca";
};
