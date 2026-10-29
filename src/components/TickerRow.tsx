import { useEffect, useMemo, type PointerEventHandler } from "react";
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

interface Props {
  ticker: string;
  index: number;
  dragging: boolean;
  visible?: Interval[]; // charts to show; all when omitted. Data for all three keeps streaming.
  onRemove: () => void;
  onGripPointerDown: PointerEventHandler<HTMLElement>;
}

export function TickerRow({ ticker, index, dragging, visible, onRemove, onGripPointerDown }: Props) {
  const coin = coinFor(ticker);
  const [m1, h1, d1] = INTERVALS;
  const series = [useSeries(coin, m1), useSeries(coin, h1), useSeries(coin, d1)];
  const ctx = useAssetCtx(coin);
  const stats = summarize(
    ctx,
    series[1].data.candles,
    series.map((s) => s.gap),
  );

  // Share this row's numbers with the overview table.
  useEffect(() => {
    statsStore.set(ticker, stats);
  });
  useEffect(() => () => statsStore.remove(ticker), [ticker]);

  return (
    <>
      <div className={`cell${dragging ? " dragging" : ""}`} data-row={index} id={ticker}>
        <StatsPanel
          ticker={ticker}
          stats={stats}
          onRemove={onRemove}
          onGripPointerDown={onGripPointerDown}
        />
      </div>
      {series
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
