import type { Interval } from "./types";

export const DEX = "xyz";

/** Display tickers; each maps to the `xyz:<TICKER>` perp on Hyperliquid. */
export const TICKERS = ["TSLA", "AMD", "AAPL", "SPCX", "PLTR"];

export const coinFor = (ticker: string) => `${DEX}:${ticker}`;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface IntervalConfig {
  interval: Interval;
  label: string;
  lookbackMs: number; // how much history to fetch over REST
  visibleBars: number; // initial zoom; scroll/zoom the chart to see the rest
}

export const INTERVALS: IntervalConfig[] = [
  { interval: "1m", label: "1 min · live", lookbackMs: 12 * HOUR, visibleBars: 120 },
  { interval: "1h", label: "1 hour", lookbackMs: 30 * DAY, visibleBars: 168 },
  { interval: "1d", label: "1 day", lookbackMs: 365 * DAY, visibleBars: 180 },
];

export const INFO_URL = "https://api.hyperliquid.xyz/info";
export const WS_URL = "wss://api.hyperliquid.xyz/ws";
