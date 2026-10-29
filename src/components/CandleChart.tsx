import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  PriceScaleMode,
  TickMarkType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, Interval } from "../types";

const UP = "#26a69a";
const DOWN = "#ef5350";

interface Props {
  candles: Candle[];
  interval: Interval;
  visibleBars: number;
  loading: boolean;
  error: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Chart axis labels in the viewer's local time (lightweight-charts defaults to UTC). */
function formatTick(time: Time, type: TickMarkType) {
  const d = new Date((time as number) * 1000);
  if (type === TickMarkType.Year) return String(d.getFullYear());
  if (type === TickMarkType.Month) return d.toLocaleString(undefined, { month: "short" });
  if (type === TickMarkType.DayOfMonth) return `${d.getDate()} ${d.toLocaleString(undefined, { month: "short" })}`;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toBar = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
});

const toVolume = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  value: c.volume,
  color: c.close >= c.open ? `${UP}55` : `${DOWN}55`,
});

export function CandleChart({ candles, interval, visibleBars, loading, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const prevRef = useRef<Candle[]>([]);

  useEffect(() => {
    const chart = createChart(containerRef.current!, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a7",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#1c2130" },
        horzLines: { color: "#1c2130" },
      },
      rightPriceScale: { borderColor: "#262c3d", mode: PriceScaleMode.Logarithmic },
      timeScale: {
        borderColor: "#262c3d",
        timeVisible: interval !== "1d",
        secondsVisible: false,
        tickMarkFormatter: formatTick,
      },
      localization: {
        timeFormatter: (t: Time) => {
          const d = new Date((t as number) * 1000);
          return interval === "1d" ? d.toLocaleDateString() : d.toLocaleString();
        },
      },
      crosshair: { mode: 0 },
    });

    priceRef.current = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderVisible: false,
      wickUpColor: UP,
      wickDownColor: DOWN,
    });
    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = priceRef.current = volumeRef.current = null;
      prevRef.current = [];
    };
  }, [interval]);

  useEffect(() => {
    const price = priceRef.current;
    const volume = volumeRef.current;
    if (!price || !volume) return;
    const prev = prevRef.current;
    prevRef.current = candles;
    if (candles.length === 0) return;

    // A live tick only touches the last bar (or appends one): update incrementally so the
    // user's scroll/zoom position is preserved. Anything else is a fresh snapshot.
    const isLiveTick =
      prev.length > 0 &&
      prev[0].time === candles[0].time &&
      (candles.length === prev.length || candles.length === prev.length + 1);

    if (isLiveTick) {
      const last = candles[candles.length - 1];
      price.update(toBar(last));
      volume.update(toVolume(last));
    } else {
      price.setData(candles.map(toBar));
      volume.setData(candles.map(toVolume));
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: candles.length - visibleBars,
        to: candles.length + 2,
      });
    }
  }, [candles, visibleBars]);

  return (
    <div className="chart-cell">
      <div ref={containerRef} className="chart" />
      {loading && candles.length === 0 && <div className="chart-overlay">Loading…</div>}
      {error && <div className="chart-overlay error">{error}</div>}
    </div>
  );
}
