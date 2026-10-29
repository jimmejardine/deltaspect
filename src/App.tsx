import { INTERVALS, TICKERS } from "./config";
import { TickerRow } from "./components/TickerRow";
import { useSocketStatus } from "./hooks/useSocketStatus";

const STATUS_TEXT = { open: "Live", connecting: "Connecting…", closed: "Disconnected" };

export default function App() {
  const status = useSocketStatus();

  return (
    <div className="app">
      <header className="topbar">
        <h1>Deltaspect</h1>
        <span className="muted">Hyperliquid · xyz equity perps</span>
        <span className={`status status-${status}`}>
          <span className="dot" /> {STATUS_TEXT[status]}
        </span>
      </header>

      <main className="grid">
        {INTERVALS.map((i) => (
          <div className="col-head" key={i.interval}>
            {i.label}
          </div>
        ))}
        <div className="col-head">Stats</div>

        {TICKERS.map((t) => (
          <TickerRow key={t} ticker={t} />
        ))}
      </main>
    </div>
  );
}
