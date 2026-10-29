import { useState, useSyncExternalStore } from "react";
import { INTERVALS } from "../config";
import { useDragReorder } from "../hooks/useDragReorder";
import { pct, sign, usd } from "../lib/format";
import type { TickerStats } from "../lib/stats";
import { statsStore } from "../lib/statsStore";
import { AddTicker } from "./AddTicker";

interface Column {
  key: string;
  label: string;
  value: (s: TickerStats) => number | null;
  format: (n: number) => string;
  coloured?: boolean; // green/red by sign
}

const price = (n: number) => `$${usd(n)}`;
const percent = (n: number) => pct(n);

const COLUMNS: Column[] = [
  { key: "price", label: "Price", value: (s) => s.price, format: price },
  { key: "change24h", label: "24h", value: (s) => s.change24h, format: percent, coloured: true },
  ...INTERVALS.map(
    ({ interval }): Column => ({
      key: `gap-${interval}`,
      label: `EMA ${interval}`,
      value: (s) => s.gaps[interval],
      format: percent,
      coloured: true,
    }),
  ),
  { key: "oracle", label: "Oracle", value: (s) => s.oracle, format: price },
  { key: "basis", label: "Basis", value: (s) => s.basis, format: (n) => pct(n, 3), coloured: true },
  { key: "high24h", label: "24h high", value: (s) => s.high24h, format: price },
  { key: "low24h", label: "24h low", value: (s) => s.low24h, format: price },
  { key: "prevDay", label: "Prev day", value: (s) => s.prevDay, format: price },
];

type Key = string; // "ticker" or a column key

type Sort = { key: Key; dir: "desc" | "asc" } | null;

/** Desc → asc → back to watchlist order. */
const nextSort = (sort: Sort, key: Key): Sort => {
  if (sort?.key !== key) return { key, dir: key === "ticker" ? "asc" : "desc" };
  const firstDir = key === "ticker" ? "asc" : "desc";
  return sort.dir === firstDir ? { key, dir: firstDir === "asc" ? "desc" : "asc" } : null;
};

function sortTickers(tickers: string[], all: Map<string, TickerStats>, sort: Sort) {
  if (!sort) return tickers;
  const { key, dir } = sort;
  const mult = dir === "asc" ? 1 : -1;
  const column = COLUMNS.find((c) => c.key === key);
  const valueOf = (t: string) => {
    const stats = all.get(t);
    return stats && column ? column.value(stats) : null;
  };
  return [...tickers].sort((a, b) => {
    if (key === "ticker") return mult * a.localeCompare(b);
    const va = valueOf(a);
    const vb = valueOf(b);
    if (va == null) return vb == null ? 0 : 1; // missing values always last
    if (vb == null) return -1;
    return mult * (va - vb);
  });
}

interface Props {
  tickers: string[]; // watchlist order
  onAdd: (ticker: string) => void;
  onRemove: (ticker: string) => void;
  onMove: (from: number, to: number) => void;
}

/**
 * Sortable table of every ticker's stats, and where the watchlist is managed: drag the grip to
 * reorder, × to remove, + to add. Click a header to sort, a ticker to jump to its charts.
 */
export function Overview({ tickers, onAdd, onRemove, onMove }: Props) {
  const all = useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);
  const [sort, setSort] = useState<Sort>(null);
  const { draggingIndex, onGripPointerDown } = useDragReorder(onMove, "[data-drag-row]");

  const header = (key: Key, label: string) => (
    <th
      key={key}
      className={sort?.key === key ? "sorted" : ""}
      aria-sort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => setSort((s) => nextSort(s, key))}
    >
      {label}
      {sort?.key === key && <span className="sort-arrow">{sort.dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );

  return (
    <div className="overview">
      <table>
        <thead>
          <tr>
            {header("ticker", "Ticker")}
            {COLUMNS.map((c) => header(c.key, c.label))}
            <th className="remove-col" aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {sortTickers(tickers, all, sort).map((t, i) => {
            const stats = all.get(t);
            return (
              // Drag-reordering only applies in watchlist order, so grips hide while sorted.
              <tr key={t} data-drag-row className={i === draggingIndex ? "dragging" : ""}>
                <th scope="row">
                  {!sort && (
                    <span className="grip" title="Drag to reorder" onPointerDown={onGripPointerDown(i)}>
                      ⋮⋮
                    </span>
                  )}
                  {/* A plain fragment link, so Back returns to the table without a reload */}
                  <a href={`#${t}`}>{t}</a>
                </th>
                {COLUMNS.map(({ key, value, format, coloured }) => {
                  const v = stats ? value(stats) : null;
                  return (
                    <td key={key} className={coloured && v != null ? sign(v) : ""}>
                      {v == null ? "—" : format(v)}
                    </td>
                  );
                })}
                <td className="remove-col">
                  <button className="remove" title={`Remove ${t}`} onClick={() => onRemove(t)}>
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <AddTicker existing={tickers} onAdd={onAdd} />
    </div>
  );
}
