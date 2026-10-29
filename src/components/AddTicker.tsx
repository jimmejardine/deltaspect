import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchListedTickers } from "../api/hyperliquid";

interface Props {
  existing: string[];
  onAdd: (ticker: string) => void;
}

/**
 * Compact "+" button that opens an inline symbol picker limited to what's listed on the dex.
 * Lives in a sortable header cell, so clicks are kept from reaching it. Errors use the browser's
 * validation bubble, which isn't clipped by the table's scroll container.
 */
export function AddTicker({ existing, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [listed, setListed] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const fail = (message: string) => {
    input.current?.setCustomValidity(message);
    input.current?.reportValidity();
  };

  useEffect(() => {
    if (!open) return;
    fetchListedTickers()
      .then(setListed)
      .catch(() => fail("Couldn't load the symbol list"));
  }, [open]);

  const close = () => {
    setOpen(false);
    setValue("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return close();
    if (existing.includes(ticker)) return fail(`${ticker} is already on the list`);
    if (!listed.includes(ticker)) return fail(`${ticker} isn't listed on xyz`);
    onAdd(ticker);
    close();
  };

  if (!open) {
    return (
      <button
        className="add-ticker"
        title="Add ticker"
        aria-label="Add ticker"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        +
      </button>
    );
  }

  return (
    <form className="add-ticker-form" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
      <input
        ref={input}
        autoFocus
        list="xyz-symbols"
        placeholder="Symbol"
        aria-label="Add ticker"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.setCustomValidity("");
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
    </form>
  );
}
