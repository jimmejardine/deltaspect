import { DEX, INFO_URL } from "../config";
import type { AssetCtx, Candle, Interval, RawAssetCtx, RawCandle } from "../types";

async function postInfo<T>(body: unknown): Promise<T> {
  const res = await fetch(INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const parseCandle = (c: RawCandle): Candle => ({
  time: Math.floor(c.t / 1000),
  open: +c.o,
  high: +c.h,
  low: +c.l,
  close: +c.c,
  volume: +c.v,
});

export const parseAssetCtx = (c: RawAssetCtx): AssetCtx => ({
  markPx: +c.markPx,
  oraclePx: +c.oraclePx,
  midPx: c.midPx == null ? null : +c.midPx,
  prevDayPx: +c.prevDayPx,
  funding: +c.funding,
  openInterest: +c.openInterest,
  dayNtlVlm: +c.dayNtlVlm,
  premium: c.premium == null ? null : +c.premium,
});

export async function fetchCandles(coin: string, interval: Interval, lookbackMs: number): Promise<Candle[]> {
  const endTime = Date.now();
  const raw = await postInfo<RawCandle[]>({
    type: "candleSnapshot",
    req: { coin, interval, startTime: endTime - lookbackMs, endTime },
  });
  return raw.map(parseCandle);
}

let ctxsPromise: Promise<Map<string, AssetCtx>> | null = null;

/** Initial stats for every asset on the dex, fetched once and shared by all rows. */
export function fetchAssetCtxs(): Promise<Map<string, AssetCtx>> {
  ctxsPromise ??= postInfo<[{ universe: { name: string }[] }, RawAssetCtx[]]>({
    type: "metaAndAssetCtxs",
    dex: DEX,
  })
    .then(([meta, ctxs]) => new Map(meta.universe.map((u, i) => [u.name, parseAssetCtx(ctxs[i])])))
    .catch((err) => {
      ctxsPromise = null;
      throw err;
    });
  return ctxsPromise;
}
