import { WS_URL } from "../config";

export type Subscription =
  | { type: "candle"; coin: string; interval: string }
  | { type: "activeAssetCtx"; coin: string };

export type SocketStatus = "connecting" | "open" | "closed";

type Handler = (data: any) => void;

const PING_MS = 30_000;
const MAX_BACKOFF_MS = 15_000;

/** Routing key for a subscription; must be derivable from both the request and incoming messages. */
const keyOf = (channel: string, coin: string, interval?: string) =>
  interval ? `${channel}:${coin}:${interval}` : `${channel}:${coin}`;

const subKey = (s: Subscription) => keyOf(s.type, s.coin, s.type === "candle" ? s.interval : undefined);

/**
 * A single multiplexed WebSocket to Hyperliquid. Subscriptions are ref-counted by key,
 * re-sent after every reconnect, and kept alive with a ping heartbeat.
 */
class HlSocket {
  private ws: WebSocket | null = null;
  private subs = new Map<string, { sub: Subscription; handlers: Set<Handler> }>();
  private statusListeners = new Set<(s: SocketStatus) => void>();
  private status: SocketStatus = "closed";
  private backoff = 1000;
  private pingTimer: number | undefined;
  private reconnectTimer: number | undefined;
  lastMessageAt = 0;

  subscribe(sub: Subscription, handler: Handler): () => void {
    const key = subKey(sub);
    let entry = this.subs.get(key);
    if (!entry) {
      entry = { sub, handlers: new Set() };
      this.subs.set(key, entry);
      this.send({ method: "subscribe", subscription: sub });
    }
    entry.handlers.add(handler);
    this.ensureConnected();

    return () => {
      const e = this.subs.get(key);
      if (!e) return;
      e.handlers.delete(handler);
      if (e.handlers.size === 0) {
        this.subs.delete(key);
        this.send({ method: "unsubscribe", subscription: sub });
      }
    };
  }

  onStatus(listener: (s: SocketStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(s: SocketStatus) {
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  private send(msg: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private ensureConnected() {
    if (this.ws || this.reconnectTimer !== undefined) return;
    this.connect();
  }

  private connect() {
    this.reconnectTimer = undefined;
    this.setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      this.setStatus("open");
      for (const { sub } of this.subs.values()) this.send({ method: "subscribe", subscription: sub });
      this.pingTimer = window.setInterval(() => this.send({ method: "ping" }), PING_MS);
    };

    ws.onmessage = (ev) => {
      this.lastMessageAt = Date.now();
      const msg = JSON.parse(ev.data);
      const { channel, data } = msg;
      let key: string | undefined;
      if (channel === "candle") key = keyOf(channel, data.s, data.i);
      else if (channel === "activeAssetCtx") key = keyOf(channel, data.coin);
      if (key) this.subs.get(key)?.handlers.forEach((h) => h(data));
    };

    ws.onclose = () => {
      window.clearInterval(this.pingTimer);
      this.ws = null;
      this.setStatus("closed");
      if (this.subs.size > 0) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
      }
    };

    ws.onerror = () => ws.close();
  }
}

export const hlSocket = new HlSocket();
