import { coinFor, INTERVALS } from "../config";
import { useAssetCtx } from "../hooks/useAssetCtx";
import { useCandles } from "../hooks/useCandles";
import { CandleChart } from "./CandleChart";
import { StatsPanel } from "./StatsPanel";

export function TickerRow({ ticker }: { ticker: string }) {
  const coin = coinFor(ticker);
  const [m1, h1, d1] = INTERVALS;
  const series = [
    { cfg: m1, data: useCandles(coin, m1.interval, m1.lookbackMs) },
    { cfg: h1, data: useCandles(coin, h1.interval, h1.lookbackMs) },
    { cfg: d1, data: useCandles(coin, d1.interval, d1.lookbackMs) },
  ];
  const ctx = useAssetCtx(coin);

  return (
    <>
      {series.map(({ cfg, data }) => (
        <div className="cell" key={cfg.interval}>
          <div className="cell-label">
            {ticker} · {cfg.interval}
          </div>
          <CandleChart
            candles={data.candles}
            interval={cfg.interval}
            visibleBars={cfg.visibleBars}
            loading={data.loading}
            error={data.error}
          />
        </div>
      ))}
      <div className="cell">
        <StatsPanel ticker={ticker} ctx={ctx} hourly={series[1].data.candles} />
      </div>
    </>
  );
}
