import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AutoRefresh } from "@/components/orders/AutoRefresh";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { EmptyState } from "@/components/ui/states";
import { ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "@/db/schema";
import { formatDateTime, ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { can } from "@/lib/permissions";
import { requirePage } from "@/server/auth";
import { listOrders } from "@/server/orders";

export const metadata = { title: "Orders" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const user = await requirePage("orders.viewRecent");
  const seesAll = can(user.role, "orders.viewAll");
  const sp = await props.searchParams;
  const q = one(sp.q);
  const date = one(sp.date);
  const statusParam = one(sp.status);
  const methodParam = one(sp.method);
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as OrderStatus) : undefined;
  const method = (PAYMENT_METHODS as readonly string[]).includes(methodParam) ? (methodParam as PaymentMethod) : undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const result = await listOrders({ q, date, status, method, page, scope: seesAll ? "all" : "recent" });
  const filtered = Boolean(q || date || status || method);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader title="Orders" description={`${result.total} order${result.total === 1 ? "" : "s"}${filtered ? " match your filters" : ""}${seesAll ? "" : " · today's orders and any still open"}. Updates automatically.`} />
      <div className="space-y-6 px-4 py-8 sm:px-8">
        <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]" role="search" aria-label="Filter orders">
          <div>
            <label htmlFor="q" className="sr-only">
              Order number
            </label>
            <input id="q" name="q" defaultValue={q} inputMode="numeric" placeholder="Order number, e.g. 1024" className="input" />
          </div>
          <div>
            <label htmlFor="date" className="sr-only">
              Date
            </label>
            <input id="date" name="date" type="date" defaultValue={date} className="input" />
          </div>
          <div>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select id="status" name="status" defaultValue={status ?? ""} className="input">
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="method" className="sr-only">
              Payment method
            </label>
            <select id="method" name="method" defaultValue={method ?? ""} className="input">
              <option value="">All payments</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-espresso flex-1">
              Filter
            </button>
            {filtered && (
              <Link href="/admin/orders" className="btn btn-outline">
                Reset
              </Link>
            )}
          </div>
        </form>

        <section className="card overflow-hidden">
          {result.rows.length === 0 ? (
            filtered ? (
              <EmptyState title="No matching orders." description="Try different filters." />
            ) : (
              <EmptyState title="No orders yet." description="Orders will appear here after customers place them." />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-cream-200 bg-cream-50 text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Date / time</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Items</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Type</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Payment</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {result.rows.map((o) => (
                    <tr key={o.id} className="group relative transition hover:bg-cream-50">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/orders/${o.id}`} className="font-bold after:absolute after:inset-0 after:content-['']">
                          #{o.orderNumber}
                        </Link>
                        <p className="text-xs text-ink-muted">
                          {o.customerName ?? (o.source === "pos" ? "Walk-in" : "—")} · {o.source === "pos" ? "POS" : "Online"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-ink-soft">{formatDateTime(o.createdAt)}</td>
                      <td className="max-w-56 px-3 py-3.5">
                        <p className="truncate text-ink-soft" title={o.itemSummary ?? ""}>
                          {o.itemSummary}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">{ORDER_TYPE_LABEL[o.orderType]}</td>
                      <td className="px-3 py-3.5">
                        <span className="flex items-center gap-1.5">
                          {o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] : "—"}
                          {o.paymentStatus && o.paymentStatus !== "paid" && <PaymentStatusBadge status={o.paymentStatus} />}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold tabular-nums">{formatPeso(o.totalCents)}</td>
                      <td className="px-5 py-3.5">
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {result.pageCount > 1 && (
          <nav className="flex items-center justify-between" aria-label="Pagination">
            <p className="text-sm text-ink-muted">
              Page {result.page} of {result.pageCount}
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link href={pageHref(result.page - 1)} className="btn btn-outline btn-sm">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
              ) : null}
              {result.page < result.pageCount ? (
                <Link href={pageHref(result.page + 1)} className="btn btn-outline btn-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
