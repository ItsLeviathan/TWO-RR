import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { OrderActions } from "@/components/orders/OrderActions";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { PrintReceiptButton } from "@/components/receipt/PrintReceipt";
import { formatDateTime, ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { can } from "@/lib/permissions";
import { requirePage } from "@/server/auth";
import { getOrderDetail, isRecentOrder, nextStatusesFor } from "@/server/orders";
import { getSettings } from "@/server/settings";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  const user = await requirePage("orders.viewRecent");
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const [order, settings] = await Promise.all([getOrderDetail(id), getSettings()]);
  if (!order) notFound();
  // Cashiers only see today's orders and open ones; older history is owner-only.
  if (!can(user.role, "orders.viewAll") && !isRecentOrder(order)) notFound();
  const canCancelPaid = can(user.role, "orders.cancelPaid");
  const nextStatuses = nextStatusesFor(order.status).filter(
    (s) => s !== "cancelled" || order.payment?.status !== "paid" || canCancelPaid,
  );

  const business = {
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    receiptHeader: settings.receiptHeader,
    receiptFooter: settings.receiptFooter,
    receiptShowAddress: settings.receiptShowAddress,
    receiptShowPhone: settings.receiptShowPhone,
    receiptWidthMm: settings.receiptWidthMm,
  };

  return (
    <>
      <PageHeader
        title={`Order #${order.orderNumber}`}
        description={`${order.source === "pos" ? "POS sale" : "Online order"} · ${formatDateTime(order.createdAt)}${order.createdBy ? ` · by ${order.createdBy.name}` : ""}`}
        actions={
          <>
            <Link href="/admin/orders" className="btn btn-outline">
              <ChevronLeft className="h-4 w-4" /> Orders
            </Link>
            <PrintReceiptButton order={order} business={business} />
          </>
        }
      />
      <div className="grid gap-6 px-4 py-8 sm:px-8 xl:grid-cols-[1fr_24rem]">
        <section className="card p-6" aria-labelledby="items-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="items-title" className="display text-2xl">
              Items
            </h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <ul className="mt-4 divide-y divide-cream-200 border-y border-cream-200">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">
                    {item.quantity} × {item.productName}
                  </p>
                  {item.summary && <p className="text-sm text-ink-muted">{item.summary}</p>}
                  <p className="text-xs text-ink-muted">{formatPeso(item.unitPriceCents)} each</p>
                </div>
                <span className="font-semibold tabular-nums">{formatPeso(item.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-ink-soft">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPeso(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPeso(order.totalCents)}</dd>
            </div>
          </dl>
          {order.notes && (
            <p className="mt-5 rounded-xl bg-cream-100 px-4 py-3 text-sm">
              <span className="font-semibold">Notes:</span> {order.notes}
            </p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="info-title">
            <h2 id="info-title" className="display text-2xl">
              Details
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-muted">Customer</dt>
                <dd className="font-semibold">{order.customerName ?? (order.source === "pos" ? "Walk-in" : "—")}</dd>
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
              {order.payment?.tenderedCents != null && (
                <>
                  <div>
                    <dt className="text-ink-muted">Cash received</dt>
                    <dd className="font-semibold tabular-nums">{formatPeso(order.payment.tenderedCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Change</dt>
                    <dd className="font-semibold tabular-nums">{formatPeso(order.payment.changeCents ?? 0)}</dd>
                  </div>
                </>
              )}
              {order.payment?.reference && (
                <div className="col-span-2">
                  <dt className="text-ink-muted">Reference</dt>
                  <dd className="font-semibold">{order.payment.reference}</dd>
                </div>
              )}
              {order.payment?.paidAt && (
                <div className="col-span-2">
                  <dt className="text-ink-muted">Paid at</dt>
                  <dd className="font-semibold">
                    {formatDateTime(order.payment.paidAt)}
                    {order.payment.recordedBy && <span className="font-normal text-ink-muted"> · recorded by {order.payment.recordedBy.name}</span>}
                  </dd>
                </div>
              )}
            </dl>
            {order.status === "cancelled" && order.payment?.status === "paid" && (
              <p className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">
                This order was cancelled after a payment of {formatPeso(order.payment.amountCents)} was recorded. Refund the customer
                manually if needed; cancelled orders are excluded from sales reports.
              </p>
            )}
          </section>

          {!canCancelPaid && order.payment?.status === "paid" && order.status !== "cancelled" && order.status !== "completed" && (
            <p className="text-sm text-ink-muted">Paid orders can only be cancelled by the owner.</p>
          )}
          <OrderActions
            orderId={order.id}
            totalCents={order.totalCents}
            nextStatuses={nextStatuses}
            paymentStatus={order.payment?.status ?? null}
            currentMethod={order.payment?.method ?? "cash"}
            paymentMethods={settings.paymentMethods}
            cancelled={order.status === "cancelled"}
          />
        </div>
      </div>
    </>
  );
}
