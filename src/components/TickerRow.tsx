import { useMemo } from "react";
import { coinFor, INTERVALS, type IntervalConfig } from "../config";
import { useAssetCtx } from "../hooks/useAssetCtx";
import { useCandles } from "../hooks/useCandles";
import { BAR_SECONDS, ema, EMA_HALF_LIFE_BARS, emaGap } from "../lib/ema";
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

export function TickerRow({ ticker }: { ticker: string }) {
  const coin = coinFor(ticker);
  const [m1, h1, d1] = INTERVALS;
  const series = [useSeries(coin, m1), useSeries(coin, h1), useSeries(coin, d1)];
  const ctx = useAssetCtx(coin);

  return (
    <>
      <div className="cell">
        <StatsPanel
          ticker={ticker}
          ctx={ctx}
          hourly={series[1].data.candles}
          gaps={series.map((s) => ({ label: s.cfg.interval, value: s.gap }))}
        />
      </div>
      {series.map(({ cfg, data, emaPoints }) => (
        <div className="cell" key={cfg.interval}>
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
