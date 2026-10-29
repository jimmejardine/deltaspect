# Deltaspect

A client-side React dashboard of equity perps on Hyperliquid's `xyz` dex (trade.xyz).
Each row is a ticker: 1-minute, 1-hour and 1-day candle charts plus a live stats panel.

- History: `POST https://api.hyperliquid.xyz/info` (`candleSnapshot`, `metaAndAssetCtxs`)
- Live: one WebSocket to `wss://api.hyperliquid.xyz/ws` (`candle` + `activeAssetCtx` subscriptions)
- No API key and no backend.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Configure

Edit `src/config.ts`:

- `TICKERS`: symbols listed on the `xyz` dex (e.g. `NVDA`, `MSFT`, `GOOGL`)
- `INTERVALS`: how much history to fetch for each chart and the initial zoom
