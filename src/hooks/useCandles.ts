import { useEffect, useState } from "react";
import { fetchCandles, parseCandle } from "../api/hyperliquid";
import { hlSocket } from "../api/hlSocket";
import type { Candle, Interval } from "../types";

/** Insert or replace a bar by open time, keeping the array sorted. */
function upsert(candles: Candle[], bar: Candle): Candle[] {
  const last = candles[candles.length - 1];
  if (!last || bar.time > last.time) return [...candles, bar];
  if (bar.time === last.time) return [...candles.slice(0, -1), bar];
  return candles; // stale update for an older bar; history already has it
}

/** Historical candles via REST, kept current by the live WebSocket candle feed. */
export function useCandles(coin: string, interval: Interval, lookbackMs: number) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCandles([]);
    setLoading(true);
    setError(null);

    // Subscribe before fetching so no bar is missed; live bars received before the
    // snapshot lands are merged on top of it.
    const unsubscribe = hlSocket.subscribe({ type: "candle", coin, interval }, (raw) => {
      setCandles((prev) => upsert(prev, parseCandle(raw)));
    });

    fetchCandles(coin, interval, lookbackMs)
      .then((history) => {
        if (cancelled) return;
        setCandles((live) => live.reduce(upsert, history));
      })
      .catch((err) => !cancelled && setError(String(err.message ?? err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [coin, interval, lookbackMs]);

  return { candles, loading, error };
}
