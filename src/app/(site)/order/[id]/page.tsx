import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { GoldRule } from "@/components/branding/Ornaments";
import { AutoRefresh } from "@/components/orders/AutoRefresh";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import type { OrderStatus } from "@/db/schema";
import { formatDateTime, ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getOrderForCustomer } from "@/server/orders";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Your Order", robots: { index: false } };

const STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "pending", label: "Received", hint: "We have your order." },
  { status: "preparing", label: "Preparing", hint: "Your order is being prepared." },
  { status: "ready", label: "Ready", hint: "Your order is ready — see you at the counter." },
  { status: "completed", label: "Completed", hint: "Enjoy the moment!" },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage(props: PageProps<"/order/[id]">) {
  const { id } = await props.params;
  const { placed } = await props.searchParams;
  if (!UUID.test(id)) notFound();
  const [order, settings] = await Promise.all([getOrderForCustomer(id), getSettings()]);
  if (!order) notFound();

  const currentIndex = STEPS.findIndex((s) => s.status === order.status);
  const isFinal = order.status === "completed" || order.status === "cancelled";
  const justPlaced = placed === "1";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      {!isFinal && <AutoRefresh seconds={20} />}

      <section className="card relative overflow-hidden px-6 py-10 text-center sm:px-12" aria-labelledby="order-title">
        <Logo src={settings.logoUrl} size={88} className="mx-auto h-auto w-[88px] animate-fade-in" alt="" />
        <p className="eyebrow mt-6 text-gold-700">{justPlaced ? "Order Received" : "Order Status"}</p>
        <h1 id="order-title" className="display mt-2 text-5xl text-ink sm:text-6xl">
          Order #{order.orderNumber}
        </h1>
        {justPlaced ? (
          <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
            Thank you for ordering from {settings.businessName}.{" "}
            {order.status === "cancelled" ? "" : "Your order is being prepared."}
          </p>
        ) : (
          <p className="mt-3 text-ink-muted">Placed {formatDateTime(order.createdAt)}</p>
        )}
        <GoldRule className="mx-auto mt-8 max-w-[10rem]" />

        {order.status === "cancelled" ? (
          <div className="mt-8">
            <OrderStatusBadge status="cancelled" className="text-sm" />
            <p className="mt-3 text-ink-muted">This order was cancelled. Please speak with our staff if you have questions.</p>
          </div>
        ) : (
          <ol className="mx-auto mt-8 grid max-w-xl grid-cols-4 gap-2" aria-label="Order progress">
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const current = i === currentIndex;
              return (
                <li key={step.status} className="flex flex-col items-center gap-2" aria-current={current ? "step" : undefined}>
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition",
                      done && "border-success-600 bg-success-600 text-white",
                      current && "border-gold-600 bg-gold-300 text-espresso-900 ring-4 ring-gold-300/40",
                      !done && !current && "border-cream-300 bg-white text-ink-muted",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn("text-xs font-semibold sm:text-sm", current ? "text-ink" : "text-ink-muted")}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {currentIndex >= 0 && order.status !== "cancelled" && (
          <p className="mt-6 font-display text-xl italic text-walnut-700" aria-live="polite">
            {STEPS[currentIndex]!.hint}
          </p>
        )}

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#details" className="btn btn-espresso">
            View Order
          </a>
          <Link href="/" className="btn btn-outline">
            Back to {settings.businessName}
          </Link>
        </div>
      </section>

      <section id="details" className="card mt-6 scroll-mt-24 p-6 sm:p-8" aria-labelledby="details-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="details-title" className="display text-3xl">
            Order details
          </h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-semibold">{order.customerName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Order type</dt>
            <dd className="font-semibold">{ORDER_TYPE_LABEL[order.orderType]}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Payment</dt>
            <dd className="font-semibold">{order.payment ? PAYMENT_METHOD_LABEL[order.payment.method] : "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Payment status</dt>
            <dd>{order.payment ? <PaymentStatusBadge status={order.payment.status} /> : "—"}</dd>
          </div>
        </dl>
        {order.payment?.status === "unpaid" && order.status !== "cancelled" && (
          <p className="mt-4 rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-soft">
            Please pay {formatPeso(order.totalCents)} at the counter when you collect your order.
          </p>
        )}
        <ul className="mt-6 divide-y divide-cream-200 border-y border-cream-200">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <div>
                <p className="font-medium">
                  {item.quantity} × {item.productName}
                </p>
                {item.summary && <p className="text-sm text-ink-muted">{item.summary}</p>}
              </div>
              <span className="tabular-nums">{formatPeso(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        {order.notes && <p className="mt-4 text-sm text-ink-soft">Notes: {order.notes}</p>}
        <div className="mt-4 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatPeso(order.totalCents)}</span>
        </div>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Bookmark this page to check your order status. {isFinal ? "" : "It refreshes automatically."}
        </p>
      </section>
    </div>
  );
}
