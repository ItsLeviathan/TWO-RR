"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adjustStock, setLowStockThreshold } from "@/server/actions/inventory";

type Item = {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  threshold: number;
  status: "untracked" | "in" | "low" | "out";
  updatedAt: Date | null;
};

const STATUS = {
  in: { label: "In Stock", cls: "bg-success-50 text-success-600 ring-success-600/25" },
  low: { label: "Low Stock", cls: "bg-warning-50 text-warning-600 ring-warning-600/25" },
  out: { label: "Out of Stock", cls: "bg-danger-50 text-danger-600 ring-danger-600/25" },
  untracked: { label: "Not tracked", cls: "bg-cream-100 text-ink-muted ring-cream-300" },
} as const;

export function InventoryTable({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => (
        <InventoryCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

function InventoryCard({ item }: { item: Item }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");
  const [threshold, setThreshold] = useState(String(item.threshold));
  const [error, setError] = useState<string | null>(null);
  const status = STATUS[item.status];

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (amount === "" || !Number.isInteger(n) || n < 0) {
      setError("Enter a whole number.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await adjustStock({ productId: item.id, mode, amount: n });
      if (result.ok) {
        toast.show(`${item.name}: ${result.data.quantity} in stock`);
        setAmount("");
      } else setError(result.error);
    });
  }

  function saveThreshold() {
    const n = Number(threshold);
    if (!Number.isInteger(n) || n < 0 || n === item.threshold) return;
    startTransition(async () => {
      const result = await setLowStockThreshold({ productId: item.id, threshold: n });
      if (result.ok) toast.show("Low-stock level saved");
      else setError(result.error);
    });
  }

  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{item.name}</h2>
          <p className="text-sm text-ink-muted">{item.categoryName}</p>
        </div>
        <span className={cn("chip ring-1 ring-inset", status.cls)}>{status.label}</span>
      </div>
      <p className="mt-4 text-4xl font-bold tabular-nums">
        {item.quantity}
        <span className="ml-2 text-base font-medium text-ink-muted">in stock</span>
      </p>
      {item.updatedAt && <p className="text-xs text-ink-muted">Updated {formatDateTime(item.updatedAt)}</p>}

      <form onSubmit={apply} className="mt-4 space-y-2">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream-100 p-1" role="group" aria-label="Adjustment type">
          {(["add", "remove", "set"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-lg py-1.5 text-sm font-semibold transition", mode === m ? "bg-white shadow-sm" : "text-ink-muted")}
            >
              {m === "add" ? "Add" : m === "remove" ? "Remove" : "Set to"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor={`amt-${item.id}`} className="sr-only">
            Amount
          </label>
          <input
            id={`amt-${item.id}`}
            className="input tabular-nums"
            inputMode="numeric"
            placeholder="Quantity"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" className="btn btn-espresso" disabled={pending || amount === ""}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </button>
        </div>
      </form>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <label htmlFor={`thr-${item.id}`} className="text-ink-muted">
          Low stock at
        </label>
        <input
          id={`thr-${item.id}`}
          className="input h-9 min-h-0 w-20 py-1 tabular-nums"
          inputMode="numeric"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value.replace(/\D/g, ""))}
          onBlur={saveThreshold}
        />
      </div>
      {error && <ErrorMessage className="mt-3">{error}</ErrorMessage>}
    </li>
  );
}
