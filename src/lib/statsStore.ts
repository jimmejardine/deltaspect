import type { TickerStats } from "./stats";

/**
 * Latest stats per ticker, written by each chart row and read by the overview table via
 * useSyncExternalStore, so live ticks re-render the table without re-rendering every row.
 */
let snapshot = new Map<string, TickerStats>();
const listeners = new Set<() => void>();

const publish = (next: Map<string, TickerStats>) => {
  snapshot = next;
  listeners.forEach((l) => l());
};

export const statsStore = {
  set(ticker: string, stats: TickerStats) {
    publish(new Map(snapshot).set(ticker, stats));
  },
  remove(ticker: string) {
    const next = new Map(snapshot);
    next.delete(ticker);
    publish(next);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
};
