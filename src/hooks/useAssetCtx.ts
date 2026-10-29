import { useEffect, useState } from "react";
import { fetchAssetCtxs, parseAssetCtx } from "../api/hyperliquid";
import { hlSocket } from "../api/hlSocket";
import type { AssetCtx } from "../types";

/** Mark/oracle/prev-day prices: seeded from one shared REST call, then live over WebSocket. */
export function useAssetCtx(coin: string) {
  const [ctx, setCtx] = useState<AssetCtx | null>(null);

  useEffect(() => {
    let live = false;
    let cancelled = false;
    setCtx(null);

    const unsubscribe = hlSocket.subscribe({ type: "activeAssetCtx", coin }, (data) => {
      live = true;
      setCtx(parseAssetCtx(data.ctx));
    });

    fetchAssetCtxs()
      .then((all) => {
        const c = all.get(coin);
        if (!cancelled && !live && c) setCtx(c);
      })
      .catch(() => {}); // the live feed will fill it in

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [coin]);

  return ctx;
}
