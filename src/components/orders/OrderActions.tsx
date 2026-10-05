"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/db/schema";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso, parsePesoToCents } from "@/lib/money";
import { recordOrderPayment, setOrderStatus } from "@/server/actions/orders";

export function OrderActions({
  orderId,
  totalCents,
  nextStatuses,
  paymentStatus,
  currentMethod,
  paymentMethods,
  cancelled,
}: {
  orderId: string;
  totalCents: number;
  nextStatuses: OrderStatus[];
  paymentStatus: PaymentStatus | null;
  currentMethod: PaymentMethod;
  paymentMethods: PaymentMethod[];
  cancelled: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const methods = paymentMethods.includes(currentMethod) ? paymentMethods : [currentMethod, ...paymentMethods];
  const [method, setMethod] = useState<PaymentMethod>(currentMethod);
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");

  const tenderedCents = parsePesoToCents(tendered);
  const change = tenderedCents !== null && tenderedCents >= totalCents ? tenderedCents - totalCents : null;
  const cashInvalid = method === "cash" && (tenderedCents === null || tenderedCents < totalCents);

  function changeStatus(status: OrderStatus) {
    if (status === "cancelled" && !window.confirm("Cancel this order? Any stock it used will be returned to inventory.")) return;
    setError(null);
    startTransition(async () => {
      const result = await setOrderStatus({ orderId, status });
      if (result.ok) toast.show(`Order marked ${ORDER_STATUS_LABEL[status].toLowerCase()}`);
      else setError(result.error);
    });
  }

  function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (cashInvalid) {
      setError(tendered.trim() ? `Cash received must be at least ${formatPeso(totalCents)}.` : "Enter the cash amount received.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordOrderPayment({
        orderId,
        method,
        tenderedCents: method === "cash" ? tenderedCents : null,
        reference: method === "cash" ? "" : reference,
      });
      if (result.ok) {
        toast.show(
          result.data.changeCents !== null ? `Payment recorded · change ${formatPeso(result.data.changeCents)}` : "Payment recorded",
        );
      } else setError(result.error);
    });
  }

  return (
    <>
      {nextStatuses.length > 0 && (
        <section className="card p-6" aria-labelledby="status-title">
          <h2 id="status-title" className="display text-2xl">
            Update status
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {nextStatuses.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => changeStatus(s)}
                className={s === "cancelled" ? "btn btn-outline text-danger-600" : s === "completed" ? "btn btn-gold" : "btn btn-espresso"}
              >
                {s === "cancelled" ? "Cancel order" : `Mark ${ORDER_STATUS_LABEL[s]}`}
              </button>
            ))}
          </div>
        </section>
      )}

      {paymentStatus === "unpaid" && !cancelled && (
        <section className="card p-6" aria-labelledby="pay-title">
          <h2 id="pay-title" className="display text-2xl">
            Record payment
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Collect {formatPeso(totalCents)} at the counter, then record it here.</p>
          <form className="mt-4 space-y-4" onSubmit={recordPayment} noValidate>
            <Segmented
              name="record-method"
              value={method}
              onChange={setMethod}
              options={methods.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))}
            />
            {method === "cash" ? (
              <div>
                <label htmlFor="record-cash" className="label">
                  Cash received
                </label>
                <input
                  id="record-cash"
                  inputMode="decimal"
                  className="input text-lg tabular-nums"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder={(totalCents / 100).toFixed(2)}
                  autoComplete="off"
                />
                <p className="mt-2 text-sm">
                  Change: <span className="font-bold tabular-nums">{change !== null ? formatPeso(change) : "—"}</span>
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="record-ref" className="label">
                  Reference number <span className="font-normal text-ink-muted">(optional)</span>
                </label>
                <input id="record-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
                <p className="hint mt-2">Only record after confirming the payment on your GCash app or card terminal.</p>
              </div>
            )}
            <button type="submit" className="btn btn-espresso w-full" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Record {PAYMENT_METHOD_LABEL[method]} payment
            </button>
          </form>
        </section>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}
