import { useEffect, useRef, useState, type ReactNode } from "react";
import { INTERVALS } from "../config";
import { pct, sign, usd } from "../lib/format";
import type { TickerStats } from "../lib/stats";

interface Props {
  ticker: string;
  stats: TickerStats;
}

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

/** Price vs EMA for each chart timeframe, in chart order. */
function GapPills({ gaps }: { gaps: TickerStats["gaps"] }) {
  return (
    <div className="gap-pills">
      {INTERVALS.map(({ interval }) => {
        const value = gaps[interval];
        return (
          <span key={interval} className={`pill ${value == null ? "" : sign(value)}`} title={`${interval} vs EMA`}>
            {value == null ? "—" : pct(value)}
          </span>
        );
      })}
    </div>
  );
}

/** Ticker symbol and (once loaded) the price. */
function StatsHead({ ticker, children }: { ticker: string; children?: ReactNode }) {
  return (
    <div className="stats-head">
      <span className="stats-ticker">{ticker}</span>
      {children}
    </div>
  );
}

export function StatsPanel({ ticker, stats }: Props) {
  const flash = useFlash(stats.price ?? undefined);
  const { price, change24h, oracle, basis, high24h, low24h, prevDay } = stats;

  if (price == null) {
    return (
      <div className="stats">
        <StatsHead ticker={ticker} />
        <GapPills gaps={stats.gaps} />
        <div className="muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="stats">
      <StatsHead ticker={ticker}>
        <span className={`stats-price ${flash}`}>${usd(price)}</span>
      </StatsHead>
      <GapPills gaps={stats.gaps} />
      <dl>
        <dt>24h change</dt>
        <dd className={change24h == null ? "" : sign(change24h)}>{change24h == null ? "—" : pct(change24h)}</dd>
        <dt>Oracle</dt>
        <dd>{oracle == null ? "—" : `$${usd(oracle)}`}</dd>
        <dt>Basis</dt>
        <dd className={basis == null ? "" : sign(basis)}>{basis == null ? "—" : pct(basis, 3)}</dd>
        <dt>24h high / low</dt>
        <dd>{high24h != null && low24h != null ? `${usd(high24h)} / ${usd(low24h)}` : "—"}</dd>
        <dt>Prev day</dt>
        <dd>{prevDay == null ? "—" : `$${usd(prevDay)}`}</dd>
      </dl>
    </div>
  );
}
