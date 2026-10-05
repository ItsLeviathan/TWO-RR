/**
 * Money is always stored and calculated as integer centavos (₱1.00 = 100) to avoid
 * floating-point rounding errors. Conversion to/from human-readable pesos happens only
 * at the edges (input parsing and display formatting).
 */

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pesoCompactFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** ₱1,234.50 — safe for any input; non-finite values render as ₱0.00. */
export function formatPeso(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  return pesoFormatter.format(safe / 100);
}

/** ₱120 or ₱120.50 — drops trailing .00 for menu display. */
export function formatPesoShort(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  return pesoCompactFormatter.format(safe / 100);
}

/**
 * Parses a peso amount typed by a person ("120", "120.5", "1,200.00", "₱ 500") into centavos.
 * Returns null for anything that is not a valid non-negative amount with at most 2 decimals.
 * Parsing is done on the string so "0.1 + 0.2"-style float errors cannot occur.
 */
export function parsePesoToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).replace(/[₱,\s]/g, "").replace(/^PHP/i, "");
  if (raw === "") return null;
  const match = /^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(raw);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Centavos → plain editable string ("120.00") for form inputs. */
export function centsToInput(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  return (safe / 100).toFixed(2);
}

export const MAX_PRICE_CENTS = 100_000_00; // ₱100,000 per item — guards against typos.
