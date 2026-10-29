import type { AssetCtx, Candle, Interval } from "../types";

/** Everything the stats panel and overview table show for one ticker; null until known. */
export interface TickerStats {
  price: number | null;
  change24h: number | null; // fraction vs the price 24h ago
  gaps: Record<Interval, number | null>; // fraction above/below each chart's EMA
  oracle: number | null;
  basis: number | null; // fraction mark vs oracle
  high24h: number | null;
  low24h: number | null;
  prevDay: number | null;
}

export function summarize(
  ctx: AssetCtx | null,
  hourly: Candle[],
  gaps: Record<Interval, number | null>,
): TickerStats {
  const since = Date.now() / 1000 - 24 * 3600;
  const last24h = hourly.filter((c) => c.time >= since);
  return {
    price: ctx?.markPx ?? null,
    change24h: ctx?.prevDayPx ? ctx.markPx / ctx.prevDayPx - 1 : null,
    gaps,
    oracle: ctx?.oraclePx ?? null,
    basis: ctx?.oraclePx ? ctx.markPx / ctx.oraclePx - 1 : null,
    high24h: last24h.length ? Math.max(...last24h.map((c) => c.high)) : null,
    low24h: last24h.length ? Math.min(...last24h.map((c) => c.low)) : null,
    prevDay: ctx?.prevDayPx ?? null,
  };
}
