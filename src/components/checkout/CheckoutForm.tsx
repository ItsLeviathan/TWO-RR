"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Banknote, CreditCard, Loader2, Smartphone } from "lucide-react";
import { useCart, useCartQuote } from "@/components/cart/CartProvider";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, ErrorMessage } from "@/components/ui/states";
import type { OrderType, PaymentMethod } from "@/db/schema";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { placeOnlineOrder } from "@/server/actions/orders";

const METHOD_ICON: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  gcash: <Smartphone className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
};

export function CheckoutForm({
  orderTypes,
  paymentMethods,
  businessName,
}: {
  orderTypes: OrderType[];
  paymentMethods: PaymentMethod[];
  businessName: string;
}) {
  const cart = useCart();
  const quote = useCartQuote(cart.lines, cart.hydrated);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // One key per checkout visit: retries of the same submission can never create a second order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [name, setName] = useState("");
  const [orderType, setOrderType] = useState<OrderType | null>(orderTypes[0] ?? null);
  const [method, setMethod] = useState<PaymentMethod | null>(paymentMethods[0] ?? null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [placed, setPlaced] = useState(false);

  if (!cart.hydrated) return <div className="skeleton mt-8 h-96" aria-busy="true" aria-label="Loading checkout" />;

  if (cart.lines.length === 0 && !placed) {
    return (
      <EmptyState
        title="Your cart is empty."
        description={`Browse the ${businessName} menu and add something you love.`}
        action={
          <Link href="/menu" className="btn btn-espresso">
            Browse Menu
          </Link>
        }
      />
    );
  }

  const quoteReady = quote.status === "ready" && quote.quote?.length === cart.lines.length;
  const canSubmit = quoteReady && quote.problems === 0 && quote.totalCents > 0 && !pending && !placed;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.customerName = "Please enter your name.";
    if (!orderType) errs.orderType = "Choose how you'd like your order.";
    if (!method) errs.paymentMethod = "Choose a payment method.";
    setFieldErrors(errs);
    if (Object.keys(errs).length || !canSubmit) return;
    setError(null);

    startTransition(async () => {
      const result = await placeOnlineOrder({
        idempotencyKey,
        items: cart.lines.map((l) => ({ productId: l.productId, optionIds: l.optionIds, addonIds: l.addonIds, quantity: l.quantity })),
        customerName: name,
        orderType,
        paymentMethod: method,
        notes,
        expectedTotalCents: quote.totalCents,
      });
      if (result.ok) {
        setPlaced(true);
        cart.clear();
        router.replace(`/order/${result.data.id}?placed=1`);
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        quote.retry();
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]" noValidate>
      <div className="card space-y-7 p-6 sm:p-8">
        <div>
          <label htmlFor="customerName" className="label">
            Your name
          </label>
          <input
            id="customerName"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            maxLength={80}
            aria-invalid={Boolean(fieldErrors.customerName)}
            aria-describedby={fieldErrors.customerName ? "customerName-error" : "customerName-hint"}
            required
          />
          {fieldErrors.customerName ? (
            <p id="customerName-error" className="field-error">
              {fieldErrors.customerName}
            </p>
          ) : (
            <p id="customerName-hint" className="hint mt-1">
              We&apos;ll call this name when your order is ready.
            </p>
          )}
        </div>

        <fieldset>
          <legend className="label">Order type</legend>
          <Segmented
            name="orderType"
            value={orderType}
            onChange={setOrderType}
            options={orderTypes.map((t) => ({ value: t, label: ORDER_TYPE_LABEL[t] }))}
          />
          {fieldErrors.orderType && <p className="field-error">{fieldErrors.orderType}</p>}
        </fieldset>

        <fieldset>
          <legend className="label">Payment method</legend>
          <Segmented
            name="paymentMethod"
            value={method}
            onChange={setMethod}
            options={paymentMethods.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m], icon: METHOD_ICON[m] }))}
          />
          {fieldErrors.paymentMethod && <p className="field-error">{fieldErrors.paymentMethod}</p>}
          <p className="hint mt-2">
            You&apos;ll pay at the counter when you collect your order
            {method && method !== "cash" ? ` — our staff will confirm your ${PAYMENT_METHOD_LABEL[method]} payment there` : ""}. No payment
            is taken online.
          </p>
        </fieldset>

        <div>
          <label htmlFor="notes" className="label">
            Notes <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            placeholder="Less ice, allergies, anything we should know"
          />
        </div>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="display text-2xl">Order summary</h2>
        <ul className="mt-4 divide-y divide-cream-200 text-sm">
          {cart.lines.map((line, i) => {
            const q = quoteReady ? quote.quote![i] : undefined;
            const unit = q && q.ok ? q.unitPriceCents : line.unitPriceCents;
            return (
              <li key={line.key} className="flex justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {line.quantity} × {line.name}
                  </p>
                  {line.summary && <p className="text-ink-muted">{line.summary}</p>}
                  {q && !q.ok && <p className="font-medium text-danger-600">{q.error}</p>}
                </div>
                <span className="shrink-0 tabular-nums">{formatPeso(unit * line.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex justify-between border-t border-cream-200 pt-4 text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">{quoteReady ? formatPeso(quote.totalCents) : "…"}</span>
        </div>

        {error && <ErrorMessage className="mt-4">{error}</ErrorMessage>}
        {quote.status === "error" && (
          <ErrorMessage className="mt-4">
            We couldn&apos;t check the latest prices.{" "}
            <button type="button" className="font-semibold underline" onClick={quote.retry}>
              Try Again
            </button>
          </ErrorMessage>
        )}
        {quoteReady && quote.problems > 0 && (
          <ErrorMessage className="mt-4">
            Some items can&apos;t be ordered right now.{" "}
            <Link href="/cart" className="font-semibold underline">
              Review your cart
            </Link>
          </ErrorMessage>
        )}

        <button type="submit" className="btn btn-gold btn-lg mt-5 w-full" disabled={!canSubmit}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
            </>
          ) : quoteReady ? (
            `Place Order · ${formatPeso(quote.totalCents)}`
          ) : (
            "Checking prices…"
          )}
        </button>
        <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-gold-700 hover:underline">
          Edit order
        </Link>
      </aside>
    </form>
  );
}
