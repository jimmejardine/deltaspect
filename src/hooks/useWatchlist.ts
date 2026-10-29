import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TICKERS } from "../config";

const STORAGE_KEY = "deltaspect.tickers";

function load(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(saved) && saved.every((t) => typeof t === "string")) return saved;
  } catch {
    // unreadable or blocked storage: fall back to the defaults
  }
  return DEFAULT_TICKERS;
}

/** The user's tickers, in display order, persisted in this browser. */
export function useWatchlist() {
  const [tickers, setTickers] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
    } catch {
      // storage unavailable: the list just won't survive a reload
    }
  }, [tickers]);

  const add = useCallback(
    (ticker: string) => setTickers((list) => (list.includes(ticker) ? list : [...list, ticker])),
    [],
  );

  const remove = useCallback((ticker: string) => setTickers((list) => list.filter((t) => t !== ticker)), []);

  const move = useCallback((from: number, to: number) => {
    setTickers((list) => {
      if (from === to || to < 0 || to >= list.length) return list;
      const next = [...list];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }, []);

  return { tickers, add, remove, move };
}
