"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { QuoteLine } from "@/lib/menu-types";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  optionIds: string[];
  addonIds: string[];
  quantity: number;
  /** Price shown when the item was added; replaced by the live server quote when available. */
  unitPriceCents: number;
  summary: string;
};

type NewLine = Omit<CartLine, "key">;

type CartApi = {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  add: (line: NewLine) => void;
  replace: (key: string, line: NewLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Increments on every add — used to animate the cart badge. */
  addPulse: number;
};

const STORAGE_KEY = "tworr.cart.v1";
const CartContext = createContext<CartApi | null>(null);

const signature = (l: Pick<CartLine, "productId" | "optionIds" | "addonIds">) =>
  `${l.productId}|${[...l.optionIds].sort().join(",")}|${[...l.addonIds].sort().join(",")}`;

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.key === "string" &&
        typeof l.productId === "string" &&
        Array.isArray(l.optionIds) &&
        Array.isArray(l.addonIds) &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0,
    );
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Cart store: localStorage-backed, synced across tabs.                */
/* ------------------------------------------------------------------ */

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

const cartStore = {
  getSnapshot(): CartLine[] {
    cache ??= readStorage();
    return cache;
  },
  getServerSnapshot(): CartLine[] {
    return EMPTY;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cache = readStorage();
        listeners.forEach((l) => l());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  update(updater: (current: CartLine[]) => CartLine[]) {
    cache = updater(cartStore.getSnapshot());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Storage unavailable (private mode / quota) — the cart still works for this page view.
    }
    listeners.forEach((l) => l());
  },
};

const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  // False during SSR and hydration, true afterwards — avoids flashing an empty cart.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addPulse, setAddPulse] = useState(0);

  const add = useCallback((line: NewLine) => {
    cartStore.update((current) => {
      const sig = signature(line);
      const existing = current.find((l) => signature(l) === sig);
      if (existing) {
        return current.map((l) =>
          l.key === existing.key ? { ...l, ...line, quantity: Math.min(99, l.quantity + line.quantity) } : l,
        );
      }
      return [...current, { ...line, key: newKey() }];
    });
    setAddPulse((n) => n + 1);
  }, []);

  const replace = useCallback((key: string, line: NewLine) => {
    cartStore.update((current) => {
      const sig = signature(line);
      const duplicate = current.find((l) => l.key !== key && signature(l) === sig);
      if (duplicate) {
        // Editing made this line identical to another one: merge them.
        return current
          .filter((l) => l.key !== key)
          .map((l) => (l.key === duplicate.key ? { ...l, quantity: Math.min(99, l.quantity + line.quantity) } : l));
      }
      return current.map((l) => (l.key === key ? { ...line, key } : l));
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.max(1, Math.min(99, Math.floor(quantity)));
    cartStore.update((current) => current.map((l) => (l.key === key ? { ...l, quantity: q } : l)));
  }, []);

  const remove = useCallback((key: string) => cartStore.update((current) => current.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => cartStore.update(() => []), []);

  const value = useMemo<CartApi>(
    () => ({
      lines,
      hydrated,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add,
      replace,
      setQuantity,
      remove,
      clear,
      drawerOpen,
      setDrawerOpen,
      addPulse,
    }),
    [lines, hydrated, add, replace, setQuantity, remove, clear, drawerOpen, addPulse],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export type QuoteState = {
  status: "idle" | "loading" | "ready" | "error";
  /** Aligned with `lines` by index. */
  quote: QuoteLine[] | null;
  totalCents: number;
  problems: number;
  retry: () => void;
};

type QuoteResult =
  | { payload: string; attempt: number; ok: true; quote: QuoteLine[]; totalCents: number; problems: number }
  | { payload: string; attempt: number; ok: false };

/**
 * Re-prices the cart against the live menu whenever it changes, so customers always see current
 * prices and availability before checking out. The status is derived: a result only counts when it
 * belongs to the current cart contents.
 */
export function useCartQuote(lines: CartLine[], enabled = true): QuoteState {
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const payload = JSON.stringify(
    lines.map((l) => ({ productId: l.productId, optionIds: l.optionIds, addonIds: l.addonIds, quantity: l.quantity })),
  );
  const isEmpty = lines.length === 0;

  useEffect(() => {
    if (!enabled || isEmpty) return;
    let cancelled = false;
    const items = JSON.parse(payload) as { quantity: number }[];
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { lines: QuoteLine[] };
        if (cancelled) return;
        const totalCents = data.lines.reduce((sum, l, i) => (l.ok ? sum + l.unitPriceCents * items[i]!.quantity : sum), 0);
        setResult({ payload, attempt, ok: true, quote: data.lines, totalCents, problems: data.lines.filter((l) => !l.ok).length });
      } catch {
        if (!cancelled) setResult({ payload, attempt, ok: false });
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload, enabled, isEmpty, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (!enabled) return { status: "idle", quote: null, totalCents: 0, problems: 0, retry };
  if (isEmpty) return { status: "ready", quote: [], totalCents: 0, problems: 0, retry };
  if (!result || result.payload !== payload || result.attempt !== attempt) {
    return { status: "loading", quote: null, totalCents: 0, problems: 0, retry };
  }
  if (!result.ok) return { status: "error", quote: null, totalCents: 0, problems: 0, retry };
  return { status: "ready", quote: result.quote, totalCents: result.totalCents, problems: result.problems, retry };
}
