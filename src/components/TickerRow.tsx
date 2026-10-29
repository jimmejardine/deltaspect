import { useEffect, useMemo } from "react";
import { coinFor, INTERVALS, type IntervalConfig } from "../config";
import { useAssetCtx } from "../hooks/useAssetCtx";
import { useCandles } from "../hooks/useCandles";
import { BAR_SECONDS, ema, EMA_HALF_LIFE_BARS, emaGap } from "../lib/ema";
import { summarize } from "../lib/stats";
import { statsStore } from "../lib/statsStore";
import type { Interval } from "../types";
import { CandleChart } from "./CandleChart";
import { StatsPanel } from "./StatsPanel";

/** Candles for one interval plus their half-life EMA. */
function useSeries(coin: string, cfg: IntervalConfig) {
  const data = useCandles(coin, cfg.interval, cfg.lookbackMs);
  const emaPoints = useMemo(
    () => ema(data.candles, EMA_HALF_LIFE_BARS, BAR_SECONDS[cfg.interval]),
    [data.candles, cfg.interval],
  );
  return { cfg, data, emaPoints, gap: emaGap(data.candles, emaPoints) };
}

type Series = ReturnType<typeof useSeries>;

interface Props {
  ticker: string;
  visible?: Interval[]; // charts to show; all when omitted. Data for all three keeps streaming.
}

export function TickerRow({ ticker, visible }: Props) {
  const coin = coinFor(ticker);
  // INTERVALS is a fixed constant, so this calls the same hooks in the same order every render.
  const all = INTERVALS.map((cfg) => useSeries(coin, cfg));
  const series = Object.fromEntries(all.map((s) => [s.cfg.interval, s])) as Record<Interval, Series>;
  const ctx = useAssetCtx(coin);
  const gaps = Object.fromEntries(all.map((s) => [s.cfg.interval, s.gap])) as Record<Interval, number | null>;
  const stats = summarize(ctx, series["1h"].data.candles, gaps);

  // Share this row's numbers with the overview table.
  useEffect(() => {
    statsStore.set(ticker, stats);
  });
  useEffect(() => () => statsStore.remove(ticker), [ticker]);

  return (
    <>
      <div className="cell" data-row id={ticker}>
        <StatsPanel ticker={ticker} stats={stats} />
      </div>
      {all
        .filter((s) => !visible || visible.includes(s.cfg.interval))
        .map(({ cfg, data, emaPoints }) => (
          <div className="cell chart-slot" key={cfg.interval}>
            <CandleChart
              candles={data.candles}
              emaPoints={emaPoints}
              interval={cfg.interval}
              visibleBars={cfg.visibleBars}
              loading={data.loading}
              error={data.error}
            />
          </div>
        ))}
    </>
  );
}
