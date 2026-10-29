import { useState, useSyncExternalStore } from "react";
import { pct, sign, usd, type TickerStats } from "../lib/stats";
import { statsStore } from "../lib/statsStore";

type Key = keyof TickerStats | "ticker";

interface Column {
  key: Key;
  label: string;
  format: (n: number) => string;
  coloured?: boolean; // green/red by sign
}

const price = (n: number) => `$${usd(n)}`;

const COLUMNS: Column[] = [
  { key: "price", label: "Price", format: price },
  { key: "change24h", label: "24h", format: (n) => pct(n), coloured: true },
  { key: "gap1m", label: "EMA 1m", format: (n) => pct(n), coloured: true },
  { key: "gap1h", label: "EMA 1h", format: (n) => pct(n), coloured: true },
  { key: "gap1d", label: "EMA 1d", format: (n) => pct(n), coloured: true },
  { key: "oracle", label: "Oracle", format: price },
  { key: "basis", label: "Basis", format: (n) => pct(n, 3), coloured: true },
  { key: "high24h", label: "24h high", format: price },
  { key: "low24h", label: "24h low", format: price },
  { key: "prevDay", label: "Prev day", format: price },
];

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
  return [...tickers].sort((a, b) => {
    if (key === "ticker") return mult * a.localeCompare(b);
    const va = all.get(a)?.[key] ?? null;
    const vb = all.get(b)?.[key] ?? null;
    if (va == null) return vb == null ? 0 : 1; // missing values always last
    if (vb == null) return -1;
    return mult * (va - vb);
  });
}

/** Sortable table of every ticker's stats; click a header to sort, a ticker to jump to its charts. */
export function Overview({ tickers }: { tickers: string[] }) {
  const all = useSyncExternalStore(statsStore.subscribe, statsStore.getSnapshot);
  const [sort, setSort] = useState<Sort>(null);

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
          </tr>
        </thead>
        <tbody>
          {sortTickers(tickers, all, sort).map((t) => {
            const stats = all.get(t);
            return (
              <tr key={t}>
                <th scope="row">
                  {/* A plain fragment link, so Back returns to the table without a reload */}
                  <a href={`#${t}`}>{t}</a>
                </th>
                {COLUMNS.map(({ key, format, coloured }) => {
                  const v = stats?.[key as keyof TickerStats] ?? null;
                  return (
                    <td key={key} className={coloured && v != null ? sign(v) : ""}>
                      {v == null ? "—" : format(v)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
