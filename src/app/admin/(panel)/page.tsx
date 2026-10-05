import Link from "next/link";
import { ArrowRight, MonitorSmartphone } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/PageHeader";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { EmptyState } from "@/components/ui/states";
import { formatTime, formatShortDate, greetingForNow, shopDateKey } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { requirePage } from "@/server/auth";
import { getDashboardData } from "@/server/reports";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePage("dashboard.view");
  const data = await getDashboardData();
  const todayKey = shopDateKey();
  const openTotal = (data.open.pending ?? 0) + (data.open.preparing ?? 0) + (data.open.ready ?? 0);

  return (
    <>
      <PageHeader
        title={`${greetingForNow()}${user.name && user.name !== "Owner" ? `, ${user.name}` : ""}`}
        description="Here's how today is going. Sales count paid, non-cancelled orders."
        actions={
          <Link href="/admin/pos" className="btn btn-gold">
            <MonitorSmartphone className="h-4 w-4" /> Open POS
          </Link>
        }
      />
      <div className="space-y-8 px-4 py-8 sm:px-8">
        <section aria-label="Today at a glance" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard accent label="Today's Sales" value={formatPeso(data.today.salesCents)} />
          <StatCard label="Orders" value={data.today.orders} hint="Paid orders today" />
          <StatCard label="Average Order" value={data.today.orders ? formatPeso(data.today.averageCents) : "—"} />
          <StatCard
            label="Best Seller"
            value={<span className="block truncate text-2xl">{data.bestSeller?.name ?? "—"}</span>}
            hint={data.bestSeller ? `${data.bestSeller.quantity} sold today` : "No sales yet today"}
          />
        </section>

        <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
          <section className="card overflow-hidden" aria-labelledby="recent-title">
            <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
              <h2 id="recent-title" className="display text-2xl">
                Recent Orders
              </h2>
              <Link href="/admin/orders" className="btn btn-ghost btn-sm">
                All orders <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <EmptyState title="No orders yet." description="Orders will appear here after customers place them." />
            ) : (
              <ul className="divide-y divide-cream-200">
                {data.recent.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition hover:bg-cream-50">
                      <span className="w-16 font-bold tabular-nums">#{o.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                        {o.customerName ?? (o.source === "pos" ? "Walk-in" : "—")}
                        <span className="ml-2 text-ink-muted">
                          {shopDateKey(o.createdAt) === todayKey ? formatTime(o.createdAt) : formatShortDate(o.createdAt)}
                        </span>
                      </span>
                      <span className="w-24 text-right font-semibold tabular-nums">{formatPeso(o.totalCents)}</span>
                      <span className="flex w-44 justify-end gap-1.5">
                        {o.paymentStatus && o.paymentStatus !== "paid" && <PaymentStatusBadge status={o.paymentStatus} />}
                        <OrderStatusBadge status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-8">
            <section className="card p-5" aria-labelledby="open-title">
              <h2 id="open-title" className="display text-2xl">
                In progress
              </h2>
              {openTotal === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">No open orders right now.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {(["pending", "preparing", "ready"] as const).map((s) => (
                    <li key={s}>
                      <Link
                        href={`/admin/orders?status=${s}`}
                        className="flex items-center justify-between rounded-xl border border-cream-200 px-4 py-3 transition hover:border-gold-500"
                      >
                        <OrderStatusBadge status={s} />
                        <span className="text-xl font-bold tabular-nums">{data.open[s] ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5" aria-labelledby="stock-title">
              <h2 id="stock-title" className="display text-2xl">
                Low stock
              </h2>
              {data.lowStock.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">Nothing is running low.</p>
              ) : (
                <ul className="mt-4 divide-y divide-cream-200 text-sm">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex justify-between py-2.5">
                      <span>{p.name}</span>
                      <span className={p.quantity === 0 ? "font-bold text-danger-600" : "font-bold text-warning-600"}>
                        {p.quantity === 0 ? "Out" : `${p.quantity} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/inventory" className="btn btn-outline btn-sm mt-4">
                Manage inventory
              </Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
