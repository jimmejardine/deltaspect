import type { Candle, Interval } from "../types";

// Same average lag as a 90-bar simple moving average: decay 89/91 per bar, ln(0.5) / ln(89/91) ≈ 31.
export const EMA_HALF_LIFE_BARS = 31;
export const BAR_SECONDS: Record<Interval, number> = { "1m": 60, "1h": 3600, "1d": 86400 };

export interface EmaPoint {
  time: number; // bar open time, unix seconds
  value: number;
}

/**
 * Half-life EMA of closes: ema = alpha * ema + (1 - alpha) * close, alpha = 0.5 ^ (bars elapsed / halfLife).
 * A bar still forming counts only the elapsed fraction of its length, so the line glides with each
 * tick and lands on the full-bar value exactly when the bar closes.
 */
export function ema(candles: Candle[], halfLifeBars: number, barSeconds: number): EmaPoint[] {
  if (candles.length === 0) return [];
  const now = Date.now() / 1000;
  let value = candles[0].close;
  return candles.map((c, i) => {
    if (i > 0) {
      const elapsed = Math.min(Math.max((now - c.time) / barSeconds, 0), 1);
      const alpha = 0.5 ** (elapsed / halfLifeBars);
      value = alpha * value + (1 - alpha) * c.close;
    }
    return { time: c.time, value };
  });
}

/** How far the latest close is from the latest EMA value, as a fraction (0.0124 = +1.24%). */
export function emaGap(candles: Candle[], points: EmaPoint[]): number | null {
  if (candles.length === 0 || points.length === 0) return null;
  return candles[candles.length - 1].close / points[points.length - 1].value - 1;
}
