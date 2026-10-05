"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Banknote, CheckCircle2, CreditCard, Loader2, Smartphone } from "lucide-react";
import { PrintReceiptButton } from "@/components/receipt/PrintReceipt";
import type { ReceiptBusiness, ReceiptOrder } from "@/components/receipt/Receipt";
import { Segmented } from "@/components/ui/controls";
import { Modal } from "@/components/ui/Modal";
import { ErrorMessage } from "@/components/ui/states";
import type { OrderType, PaymentMethod } from "@/db/schema";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso, formatPesoShort, parsePesoToCents } from "@/lib/money";
import { completePosSale, getReceiptData } from "@/server/actions/orders";
import type { PosLine } from "./PosApp";

const ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-5 w-5" />,
  gcash: <Smartphone className="h-5 w-5" />,
  card: <CreditCard className="h-5 w-5" />,
};

/** Exact amount plus the next common bill amounts above the total. */
function quickAmounts(totalCents: number): number[] {
  const candidates = [totalCents];
  for (const step of [5000, 10000, 50000, 100000]) {
    candidates.push(Math.ceil(totalCents / step) * step);
  }
  candidates.push(100000);
  return [...new Set(candidates.filter((c) => c >= totalCents))].sort((a, b) => a - b).slice(0, 5);
}

type Completed = { orderId: string; orderNumber: number; changeCents: number | null; receipt: ReceiptOrder | null };

export function PosPaymentDialog({
  saleKey,
  lines,
  totalCents,
  orderType,
  customerName,
  notes,
  paymentMethods,
  business,
  onClose,
  onNewSale,
}: {
  saleKey: string;
  lines: PosLine[];
  totalCents: number;
  orderType: OrderType;
  customerName: string;
  notes: string;
  paymentMethods: PaymentMethod[];
  business: ReceiptBusiness;
  onClose: () => void;
  onNewSale: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(paymentMethods[0] ?? "cash");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState<Completed | null>(null);

  const tenderedCents = parsePesoToCents(tendered);
  // Change is only ever computed from a valid amount that covers the total — never NaN or negative.
  const changeCents = tenderedCents !== null && tenderedCents >= totalCents ? tenderedCents - totalCents : null;

  let validation: string | null = null;
  if (method === "cash") {
    if (tendered.trim() === "") validation = "Enter the cash amount received.";
    else if (tenderedCents === null) validation = "Enter a valid amount, e.g. 500 or 500.00.";
    else if (tenderedCents < totalCents) validation = `Cash received is less than the total. ${formatPeso(totalCents - tenderedCents)} more is needed.`;
  } else if (!confirmed) {
    validation = `Confirm that the ${PAYMENT_METHOD_LABEL[method]} payment was received.`;
  }
  const canComplete = !validation && !pending && totalCents > 0;

  function complete() {
    setTouched(true);
    if (!canComplete) return;
    setError(null);
    startTransition(async () => {
      const result = await completePosSale({
        idempotencyKey: saleKey,
        items: lines.map((l) => ({ productId: l.product.id, optionIds: l.optionIds, addonIds: l.addonIds, quantity: l.quantity })),
        customerName,
        orderType,
        notes,
        paymentMethod: method,
        tenderedCents: method === "cash" ? tenderedCents : null,
        reference: method === "cash" ? "" : reference,
        expectedTotalCents: totalCents,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      let receipt: ReceiptOrder | null = null;
      try {
        receipt = await getReceiptData(result.data.id);
      } catch {
        receipt = null;
      }
      setCompleted({ orderId: result.data.id, orderNumber: result.data.orderNumber, changeCents: result.data.changeCents, receipt });
    });
  }

  if (completed) {
    return (
      <Modal open onClose={onNewSale} title="Sale complete">
        <div className="overflow-y-auto px-6 pb-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success-600" aria-hidden />
          <p className="eyebrow mt-4 text-gold-700">Payment recorded</p>
          <p className="display mt-1 text-5xl">Order #{completed.orderNumber}</p>
          {completed.changeCents !== null && (
            <div className="mx-auto mt-6 max-w-xs rounded-2xl bg-espresso-900 px-6 py-5 text-cream-50">
              <p className="eyebrow text-gold-300">Change due</p>
              <p className="mt-1 text-5xl font-bold tabular-nums text-gold-200" aria-live="assertive">
                {formatPeso(completed.changeCents)}
              </p>
            </div>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {completed.receipt ? (
              <PrintReceiptButton order={completed.receipt} business={business} className="btn-lg w-full" />
            ) : (
              <Link href={`/admin/orders/${completed.orderId}`} className="btn btn-outline btn-lg">
                Open order to print
              </Link>
            )}
            <button type="button" className="btn btn-gold btn-lg w-full" onClick={onNewSale} autoFocus>
              New Sale
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={pending ? () => {} : onClose} title="Payment" className="sm:max-w-xl">
      <form
        className="overflow-y-auto px-5 pb-5"
        onSubmit={(e) => {
          e.preventDefault();
          complete();
        }}
        noValidate
      >
        <div className="rounded-2xl bg-espresso-900 px-5 py-4 text-cream-50">
          <p className="eyebrow text-gold-300">Total</p>
          <p className="text-5xl font-bold tabular-nums text-gold-200">{formatPeso(totalCents)}</p>
        </div>

        <fieldset className="mt-5">
          <legend className="label">Payment method</legend>
          <Segmented
            name="pos-payment-method"
            size="lg"
            value={method}
            onChange={(m) => {
              setMethod(m);
              setTouched(false);
              setError(null);
            }}
            options={paymentMethods.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m], icon: ICONS[m] }))}
          />
        </fieldset>

        {method === "cash" ? (
          <div className="mt-5">
            <label htmlFor="cash-received" className="label">
              Cash Received
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-ink-muted">₱</span>
              <input
                id="cash-received"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                className="input h-16 pl-10 text-3xl font-bold tabular-nums"
                value={tendered}
                onChange={(e) => {
                  setTendered(e.target.value.replace(/[^\d.,]/g, ""));
                  setError(null);
                }}
                onBlur={() => setTouched(true)}
                placeholder="0.00"
                aria-invalid={touched && Boolean(validation)}
                aria-describedby="cash-validation"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts(totalCents).map((amount, i) => (
                <button
                  key={amount}
                  type="button"
                  className="btn btn-outline min-h-12 flex-1 px-4 text-base"
                  onClick={() => {
                    setTendered((amount / 100).toFixed(2));
                    setTouched(true);
                  }}
                >
                  {i === 0 ? "Exact" : formatPesoShort(amount)}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-cream-300 bg-white px-5 py-4">
              <span className="text-lg font-semibold">Change</span>
              <span className="text-3xl font-bold tabular-nums text-success-600" aria-live="polite">
                {changeCents !== null ? formatPeso(changeCents) : "—"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-soft">
              {PAYMENT_METHOD_LABEL[method]} payments are not processed by this system. Confirm the payment on your{" "}
              {method === "gcash" ? "GCash app" : "card terminal"} first, then record it here.
            </p>
            <div>
              <label htmlFor="payment-reference" className="label">
                Reference number <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="payment-reference"
                className="input"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={80}
                autoComplete="off"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-300 bg-white p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-espresso-900"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span className="text-sm font-medium">
                I confirm the {PAYMENT_METHOD_LABEL[method]} payment of {formatPeso(totalCents)} was received.
              </span>
            </label>
          </div>
        )}

        <p id="cash-validation" className="field-error min-h-5" role={touched && validation ? "alert" : undefined}>
          {touched && validation ? validation : ""}
        </p>
        {error && <ErrorMessage className="mt-2">{error}</ErrorMessage>}

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
          <button type="button" className="btn btn-outline btn-lg" onClick={onClose} disabled={pending}>
            Back
          </button>
          <button type="submit" className="btn btn-gold btn-lg text-lg" disabled={pending || (touched && !canComplete)}>
            {pending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Completing…
              </>
            ) : (
              "Complete Sale"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
