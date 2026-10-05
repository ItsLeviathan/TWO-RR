"use client";

import { Pencil, Trash2 } from "lucide-react";
import { QuantityStepper, Segmented } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/states";
import type { OrderType } from "@/db/schema";
import { ORDER_TYPE_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import type { PosLine } from "./PosApp";

export function PosOrderPanel({
  idPrefix,
  showTitle = true,
  lines,
  totalCents,
  orderTypes,
  orderType,
  onOrderType,
  customerName,
  onCustomerName,
  notes,
  onNotes,
  onQuantity,
  onRemove,
  onEdit,
  onClear,
  onCharge,
}: {
  idPrefix: string;
  /** False inside the tablet sheet, whose own header already names it. */
  showTitle?: boolean;
  lines: PosLine[];
  totalCents: number;
  orderTypes: OrderType[];
  orderType: OrderType;
  onOrderType: (t: OrderType) => void;
  customerName: string;
  onCustomerName: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  onQuantity: (key: string, q: number) => void;
  onRemove: (key: string) => void;
  onEdit: (line: PosLine) => void;
  onClear: () => void;
  onCharge: () => void;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className={`flex items-center justify-between border-b border-cream-200 px-4 ${showTitle ? "py-3" : "py-1"}`}>
        {showTitle ? <h2 className="display text-2xl">Current Order</h2> : <span className="text-sm text-ink-muted">{lines.length} line{lines.length === 1 ? "" : "s"}</span>}
        {lines.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm text-danger-600" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <EmptyState title="No items yet." description="Tap a product to add it to this order." className="py-16" />
        ) : (
          <ul className="divide-y divide-cream-200">
            {lines.map((line) => (
              <li key={line.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{line.product.name}</p>
                    {line.summary && <p className="text-sm text-ink-muted">{line.summary}</p>}
                    <p className="text-xs text-ink-muted tabular-nums">{formatPeso(line.unitPriceCents)} each</p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums">{formatPeso(line.unitPriceCents * line.quantity)}</p>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <QuantityStepper value={line.quantity} onChange={(q) => onQuantity(line.key, q)} label={`Quantity of ${line.product.name}`} />
                  {(line.product.options.length > 0 || line.product.addons.length > 0) && (
                    <button type="button" className="btn btn-ghost btn-icon ml-auto" onClick={() => onEdit(line)} aria-label={`Edit ${line.product.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn btn-ghost btn-icon text-danger-600 ${line.product.options.length || line.product.addons.length ? "" : "ml-auto"}`}
                    onClick={() => onRemove(line.key)}
                    aria-label={`Remove ${line.product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-cream-200 bg-cream-50 p-4">
        <Segmented
          name={`${idPrefix}-order-type`}
          value={orderType}
          onChange={onOrderType}
          options={orderTypes.map((t) => ({ value: t, label: ORDER_TYPE_LABEL[t] }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${idPrefix}-customer`} className="sr-only">
              Customer name (optional)
            </label>
            <input
              id={`${idPrefix}-customer`}
              className="input"
              placeholder="Name (optional)"
              value={customerName}
              onChange={(e) => onCustomerName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-notes`} className="sr-only">
              Notes (optional)
            </label>
            <input
              id={`${idPrefix}-notes`}
              className="input"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>
        <dl className="space-y-1 pt-1">
          <div className="flex justify-between text-sm text-ink-soft">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPeso(totalCents)}</dd>
          </div>
          <div className="flex justify-between text-2xl font-bold">
            <dt>TOTAL</dt>
            <dd className="tabular-nums">{formatPeso(totalCents)}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-gold min-h-16 w-full text-lg" disabled={lines.length === 0 || totalCents <= 0} onClick={onCharge}>
          Charge {formatPeso(totalCents)}
        </button>
      </div>
    </div>
  );
}
