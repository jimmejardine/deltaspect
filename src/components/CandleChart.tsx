import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type ISeriesPrimitiveAxisView,
  PriceScaleMode,
  type SeriesAttachedParameter,
  type SeriesType,
  TickMarkType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, Interval } from "../types";

const UP = "#26a69a";
const DOWN = "#ef5350";
const EMA_COLOR = "#e0b341";
// Same average lag as a 90-bar simple moving average: decay 89/91 per bar, ln(0.5) / ln(89/91) ≈ 31.
const EMA_HALF_LIFE_BARS = 31;
const BAR_SECONDS: Record<Interval, number> = { "1m": 60, "1h": 3600, "1d": 86400 };

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

/**
 * Half-life EMA of closes: ema = alpha * ema + (1 - alpha) * close, alpha = 0.5 ^ (bars elapsed / halfLife).
 * A bar still forming counts only the elapsed fraction of its length, so the line glides with each
 * tick and lands on the full-bar value exactly when the bar closes.
 */
function ema(candles: Candle[], halfLifeBars: number, barSeconds: number) {
  if (candles.length === 0) return [];
  const now = Date.now() / 1000;
  let value = candles[0].close;
  return candles.map((c, i) => {
    if (i > 0) {
      const elapsed = Math.min(Math.max((now - c.time) / barSeconds, 0), 1);
      const alpha = 0.5 ** (elapsed / halfLifeBars);
      value = alpha * value + (1 - alpha) * c.close;
    }
    return { time: c.time as UTCTimestamp, value };
  });
}

/**
 * Gold price-axis label at the EMA's level showing how far the latest price is from it, e.g. "+1.24%".
 * A series primitive because the series' own last-value label can only show a formatted price.
 */
class EmaGapLabel implements ISeriesPrimitive<Time> {
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private close = 0;
  private ema = 0;

  private readonly view: ISeriesPrimitiveAxisView = {
    coordinate: () => this.series?.priceToCoordinate(this.ema) ?? -1000,
    text: () => {
      const diff = (this.close / this.ema - 1) * 100;
      return `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`;
    },
    textColor: () => "#0b0e15",
    backColor: () => EMA_COLOR,
    visible: () => this.close > 0 && this.ema > 0,
  };

  attached({ series, requestUpdate }: SeriesAttachedParameter<Time>) {
    this.series = series;
    this.requestUpdate = requestUpdate;
  }

  detached() {
    this.series = this.requestUpdate = null;
  }

  set(close: number, ema: number) {
    this.close = close;
    this.ema = ema;
    this.requestUpdate?.();
  }

  priceAxisViews() {
    return [this.view];
  }
}

export function CandleChart({ candles, interval, visibleBars, loading, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const emaRef = useRef<ISeriesApi<"Line"> | null>(null);
  const gapRef = useRef<EmaGapLabel | null>(null);
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
    emaRef.current = chart.addSeries(LineSeries, {
      color: EMA_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    gapRef.current = new EmaGapLabel();
    emaRef.current.attachPrimitive(gapRef.current);
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = priceRef.current = volumeRef.current = emaRef.current = null;
      gapRef.current = null;
      prevRef.current = [];
    };
  }, [interval]);

  useEffect(() => {
    const price = priceRef.current;
    const volume = volumeRef.current;
    const emaLine = emaRef.current;
    if (!price || !volume || !emaLine) return;
    const prev = prevRef.current;
    prevRef.current = candles;
    if (candles.length === 0) return;
    const emaPoints = ema(candles, EMA_HALF_LIFE_BARS, BAR_SECONDS[interval]);
    gapRef.current?.set(candles[candles.length - 1].close, emaPoints[emaPoints.length - 1].value);

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
      const lastEma = emaPoints[emaPoints.length - 1];
      if (lastEma?.time === last.time) emaLine.update(lastEma);
    } else {
      price.setData(candles.map(toBar));
      volume.setData(candles.map(toVolume));
      emaLine.setData(emaPoints);
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: candles.length - visibleBars,
        to: candles.length + 2,
      });
    }
  }, [candles, interval, visibleBars]);

  return (
    <div className="chart-cell">
      <div ref={containerRef} className="chart" />
      {loading && candles.length === 0 && <div className="chart-overlay">Loading…</div>}
      {error && <div className="chart-overlay error">{error}</div>}
    </div>
  );
}
