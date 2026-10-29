export type Interval = "1m" | "1h" | "1d";

export interface Candle {
  time: number; // open time, unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Live per-asset prices from Hyperliquid. */
export interface AssetCtx {
  markPx: number;
  oraclePx: number;
  prevDayPx: number; // mark price 24h ago (rolling, not a daily close)
}
