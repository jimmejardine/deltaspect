import { useState } from "react";
import { INTERVALS, TICKERS } from "./config";
import { TickerRow } from "./components/TickerRow";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useSocketStatus } from "./hooks/useSocketStatus";
import type { Interval } from "./types";

const STATUS_TEXT = { open: "Live", connecting: "Connecting…", closed: "Disconnected" };

export default function App() {
  const status = useSocketStatus();
  // Narrow screens show one chart per ticker, chosen with a shared tab bar.
  const narrow = useMediaQuery("(max-width: 900px)");
  const [tab, setTab] = useState<Interval>("1m");

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

        {TICKERS.map((t) => (
          <TickerRow key={t} ticker={t} visible={narrow ? [tab] : undefined} />
        ))}
      </main>

      <span className={`status status-${status}`}>
        <span className="dot" /> {STATUS_TEXT[status]}
      </span>
    </div>
  );
}
