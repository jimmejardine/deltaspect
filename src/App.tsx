import { useEffect, useState } from "react";
import { INTERVALS } from "./config";
import { AddTicker } from "./components/AddTicker";
import { Overview } from "./components/Overview";
import { TickerRow } from "./components/TickerRow";
import { useDragReorder } from "./hooks/useDragReorder";
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
  const { draggingIndex, onGripPointerDown } = useDragReorder(move);

  // Opened with a link like /#NVDA: the rows didn't exist when the browser looked for the
  // anchor, so jump to it now that they've rendered.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="app">
      <Overview tickers={tickers} />

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
        {tickers.map((t, i) => (
          <TickerRow
            key={t}
            ticker={t}
            index={i}
            dragging={i === draggingIndex}
            visible={narrow ? [tab] : undefined}
            onRemove={() => remove(t)}
            onGripPointerDown={onGripPointerDown(i)}
          />
        ))}
      </main>

      <AddTicker existing={tickers} onAdd={add} />

      <span className={`status status-${status}`}>
        <span className="dot" /> {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
