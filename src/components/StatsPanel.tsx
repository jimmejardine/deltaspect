import { useEffect, useRef, useState, type PointerEventHandler, type ReactNode } from "react";
import type { AssetCtx, Candle } from "../types";

interface Props {
  ticker: string;
  ctx: AssetCtx | null;
  hourly: Candle[];
  gaps: { label: string; value: number | null }[]; // price vs EMA per chart interval
  onRemove: () => void;
  onGripPointerDown: PointerEventHandler<HTMLElement>;
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

function GapPills({ gaps }: { gaps: Props["gaps"] }) {
  return (
    <div className="gap-pills">
      {gaps.map(({ label, value }) => (
        <span key={label} className={`pill ${value == null ? "" : sign(value)}`} title={`${label} vs EMA`}>
          {value == null ? "—" : pct(value)}
        </span>
      ))}
    </div>
  );
}

/** Ticker row: drag grip, symbol, remove button, and (once loaded) the price. */
type HeadProps = Pick<Props, "ticker" | "onRemove" | "onGripPointerDown"> & { children?: ReactNode };

function StatsHead({ ticker, onRemove, onGripPointerDown, children }: HeadProps) {
  return (
    <div className="stats-head">
      <span className="grip" title="Drag to reorder" onPointerDown={onGripPointerDown}>
        ⋮⋮
      </span>
      <span className="stats-ticker">{ticker}</span>
      <button className="remove" title={`Remove ${ticker}`} onClick={onRemove}>
        ×
      </button>
      {children}
    </div>
  );
}

export function StatsPanel({ ticker, ctx, hourly, gaps, onRemove, onGripPointerDown }: Props) {
  const flash = useFlash(ctx?.markPx);
  const head = { ticker, onRemove, onGripPointerDown };

  if (!ctx) {
    return (
      <div className="stats">
        <StatsHead {...head} />
        <GapPills gaps={gaps} />
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
      <StatsHead {...head}>
        <span className={`stats-price ${flash}`}>${usd(ctx.markPx)}</span>
      </StatsHead>
      <GapPills gaps={gaps} />
      <dl>
        <dt>24h change</dt>
        <dd className={sign(change)}>{pct(change)}</dd>
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
