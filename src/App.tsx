import { useEffect, useState } from "react";
import { INTERVALS } from "./config";
import { Overview } from "./components/Overview";
import { TickerRow } from "./components/TickerRow";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useSocketStatus } from "./hooks/useSocketStatus";
import { useWatchlist } from "./hooks/useWatchlist";
import type { Interval } from "./types";

const STATUS_TEXT = { open: "Live", connecting: "Connecting…", closed: "Disconnected" };

export default function App() {
  const status = useSocketStatus();
  // Narrow screens show one chart per ticker, chosen with a shared tab bar.
  const narrow = useMediaQuery("(max-width: 900px)");
  const [tab, setTab] = useState<Interval>("1m");
  const { tickers, add, remove, move } = useWatchlist();

  // Opened with a link like /#NVDA: the rows didn't exist when the browser looked for the
  // anchor, so jump to it now that they've rendered.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="app">
      <Overview tickers={tickers} onAdd={add} onRemove={remove} onMove={move} />

      {narrow && (
        <nav className="tabs">
          {INTERVALS.map((i) => (
            <button
              key={i.interval}
              className={i.interval === tab ? "active" : ""}
              aria-pressed={i.interval === tab}
              onClick={() => setTab(i.interval)}
            >
              {i.label}
            </button>
          ))}
        </nav>
      )}

      <main className="grid">
        {tickers.map((t) => (
          <TickerRow key={t} ticker={t} visible={narrow ? [tab] : undefined} />
        ))}
      </main>

      <div className="pills">
        <a className="pill github" href="https://github.com/jimmejardine/deltaspect" target="_blank" rel="noreferrer">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          GitHub
        </a>
        <span className={`pill status-${status}`}>
          <span className="dot" /> {STATUS_TEXT[status]}
        </span>
      </div>
    </div>
  );
}
