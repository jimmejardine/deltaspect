import { DEX, INFO_URL, tickerFor } from "../config";
import type { AssetCtx, Candle, Interval } from "../types";

/** Raw shapes returned by the Hyperliquid API (numbers arrive as strings). Only the fields we use. */
export interface RawCandle {
  t: number; // open time, ms
  s: string; // coin
  i: string; // interval
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
}

export interface RawAssetCtx {
  markPx: string;
  oraclePx: string;
  prevDayPx: string;
}

const MAX_ATTEMPTS = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST to the info endpoint, backing off and retrying when Hyperliquid rate-limits us (429). */
async function postInfo<T>(body: unknown): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json() as Promise<T>;
    if (res.status !== 429 || attempt === MAX_ATTEMPTS) {
      throw new Error(`Hyperliquid ${res.status}: ${await res.text()}`);
    }
    // 1s, 2s, 4s, 8s, 16s plus jitter so the rows don't all retry at once
    await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 1000);
  }
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
  prevDayPx: +c.prevDayPx,
});

const inflight = new Map<string, Promise<Candle[]>>();

/** Candle history; identical requests already in flight share one network call. */
export function fetchCandles(coin: string, interval: Interval, lookbackMs: number): Promise<Candle[]> {
  const key = `${coin}|${interval}|${lookbackMs}`;
  let promise = inflight.get(key);
  if (!promise) {
    const endTime = Date.now();
    promise = postInfo<RawCandle[]>({
      type: "candleSnapshot",
      req: { coin, interval, startTime: endTime - lookbackMs, endTime },
    })
      .then((raw) => raw.map(parseCandle))
      .finally(() => inflight.delete(key));
    inflight.set(key, promise);
  }
  return promise;
}

let ctxsPromise: Promise<Map<string, AssetCtx>> | null = null;

/** Initial prices for every asset on the dex, fetched once and shared by all rows. */
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

/** Every ticker listed on the dex (e.g. "TSLA"), sorted; reuses the cached asset request. */
export async function fetchListedTickers(): Promise<string[]> {
  const all = await fetchAssetCtxs();
  return [...all.keys()].map(tickerFor).sort();
}
