import { useEffect, useRef, useState } from "react";
import type { AssetCtx, Candle } from "../types";

interface Props {
  ticker: string;
  ctx: AssetCtx | null;
  hourly: Candle[];
}

const usd = (n: number, digits = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;

const sign = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");

/** Flashes green/red briefly whenever `value` ticks up or down. */
function useFlash(value: number | undefined) {
  const prev = useRef(value);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (value === undefined || before === undefined || value === before) return;
    setFlash(value > before ? "flash-up" : "flash-down");
    const t = window.setTimeout(() => setFlash(""), 400);
    return () => window.clearTimeout(t);
  }, [value]);
  return flash;
}

export function StatsPanel({ ticker, ctx, hourly }: Props) {
  const flash = useFlash(ctx?.markPx);

  if (!ctx) {
    return (
      <div className="stats">
        <div className="stats-ticker">{ticker}</div>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  const change = ctx.prevDayPx ? ctx.markPx / ctx.prevDayPx - 1 : 0;
  const basis = ctx.oraclePx ? ctx.markPx / ctx.oraclePx - 1 : 0;
  const since = Date.now() / 1000 - 24 * 3600;
  const last24h = hourly.filter((c) => c.time >= since);
  const high = last24h.length ? Math.max(...last24h.map((c) => c.high)) : null;
  const low = last24h.length ? Math.min(...last24h.map((c) => c.low)) : null;

  return (
    <div className="stats">
      <div className="stats-ticker">{ticker}</div>
      <div className="stats-head">
        <span className={`stats-price ${flash}`}>${usd(ctx.markPx)}</span>
        <span className={`stats-change ${sign(change)}`}>{pct(change)}</span>
      </div>
      <dl>
        <dt>Oracle</dt>
        <dd>${usd(ctx.oraclePx)}</dd>
        <dt>Basis</dt>
        <dd className={sign(basis)}>{pct(basis, 3)}</dd>
        <dt>24h high / low</dt>
        <dd>{high != null && low != null ? `${usd(high)} / ${usd(low)}` : "—"}</dd>
        <dt>Prev day</dt>
        <dd>${usd(ctx.prevDayPx)}</dd>
      </dl>
    </div>
  );
}
