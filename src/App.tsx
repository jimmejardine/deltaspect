import { useState } from "react";
import { INTERVALS } from "./config";
import { AddTicker } from "./components/AddTicker";
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

  return (
    <div className="app">
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
        {!narrow && (
          <>
            <div className="col-head" />
            {INTERVALS.map((i) => (
              <div className="col-head" key={i.interval}>
                {i.label}
              </div>
            ))}
          </>
        )}

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
