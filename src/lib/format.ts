/** 1234.5 → "1,234.50" (in the viewer's locale). */
export const usd = (n: number, digits = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 0.0124 → "+1.24%". */
export const pct = (n: number, digits = 2) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;

/** CSS class for green/red colouring by sign. */
export const sign = (n: number) => (n > 0 ? "up" : n < 0 ? "down" : "");
