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
import type { EmaPoint } from "../lib/ema";
import { pct } from "../lib/format";
import { theme } from "../theme";
import type { Candle, Interval } from "../types";

interface Props {
  candles: Candle[];
  emaPoints: EmaPoint[];
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
  color: c.close >= c.open ? `${theme.up}55` : `${theme.down}55`, // 55 = translucent
});

const toLinePoint = (p: EmaPoint) => ({ time: p.time as UTCTimestamp, value: p.value });

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
    text: () => pct(this.close / this.ema - 1),
    textColor: () => theme.bg,
    backColor: () => theme.ema,
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

export function CandleChart({ candles, emaPoints, interval, visibleBars, loading, error }: Props) {
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
        textColor: theme.axisText,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: {
        borderColor: theme.border,
        mode: PriceScaleMode.Logarithmic,
        autoScale: true,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      // Manual price-axis dragging would switch auto-fit off; keep the y axis fitted to the visible bars.
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      handleScroll: { vertTouchDrag: false },
      timeScale: {
        borderColor: theme.border,
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
      upColor: theme.up,
      downColor: theme.down,
      borderVisible: false,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });
    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    emaRef.current = chart.addSeries(LineSeries, {
      color: theme.ema,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    gapRef.current = new EmaGapLabel();
    emaRef.current.attachPrimitive(gapRef.current);
    // Re-fit the y axis whenever the visible bars change, even if a vertical drag switched auto-fit off.
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      chart.priceScale("right").applyOptions({ autoScale: true });
    });
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
    if (candles.length === 0 || emaPoints.length === 0) return;
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
      if (lastEma?.time === last.time) emaLine.update(toLinePoint(lastEma));
    } else {
      price.setData(candles.map(toBar));
      volume.setData(candles.map(toVolume));
      emaLine.setData(emaPoints.map(toLinePoint));
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: candles.length - visibleBars,
        to: candles.length + 2,
      });
    }
  }, [candles, emaPoints, visibleBars]);

  return (
    <div className="chart-cell">
      <div ref={containerRef} className="chart" />
      {loading && candles.length === 0 && <div className="chart-overlay">Loading…</div>}
      {error && <div className="chart-overlay error">{error}</div>}
    </div>
  );
}
