import { useEffect, useState, type FormEvent } from "react";
import { fetchAssetCtxs } from "../api/hyperliquid";
import { tickerFor } from "../config";

interface Props {
  existing: string[];
  onAdd: (ticker: string) => void;
}

/** "+ Add ticker" button that opens a symbol picker limited to what's listed on the dex. */
export function AddTicker({ existing, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listed, setListed] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchAssetCtxs()
      .then((all) => setListed([...all.keys()].map(tickerFor).sort()))
      .catch(() => setError("Couldn't load the symbol list"));
  }, [open]);

  const close = () => {
    setOpen(false);
    setValue("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return close();
    if (existing.includes(ticker)) return setError(`${ticker} is already on the list`);
    if (!listed.includes(ticker)) return setError(`${ticker} isn't listed on xyz`);
    onAdd(ticker);
    close();
  };

  if (!open) {
    return (
      <button className="add-ticker" onClick={() => setOpen(true)}>
        + Add ticker
      </button>
    );
  }

  return (
    <form className="add-ticker-form" onSubmit={submit}>
      <input
        autoFocus
        list="xyz-symbols"
        placeholder="Symbol, e.g. NVDA"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === "Escape" && close()}
        onBlur={() => !value && close()}
      />
      <datalist id="xyz-symbols">
        {listed
          .filter((t) => !existing.includes(t))
          .map((t) => (
            <option key={t} value={t} />
          ))}
      </datalist>
      <button type="submit">Add</button>
      {error && <span className="add-ticker-error">{error}</span>}
    </form>
  );
}
