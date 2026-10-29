export type Interval = "1m" | "1h" | "1d";

export interface Candle {
  time: number; // open time, unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetCtx {
  markPx: number;
  oraclePx: number;
  midPx: number | null;
  prevDayPx: number;
  funding: number; // hourly rate
  openInterest: number; // contracts
  dayNtlVlm: number; // 24h notional volume, USD
  premium: number | null;
}

/** Raw shapes returned by the Hyperliquid API (numbers arrive as strings). */
export interface RawCandle {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

export interface RawAssetCtx {
  markPx: string;
  oraclePx: string;
  midPx: string | null;
  prevDayPx: string;
  funding: string;
  openInterest: string;
  dayNtlVlm: string;
  premium: string | null;
}
