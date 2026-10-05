import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { SalesChart } from "@/components/charts/SalesChart";
import { PageHeader, StatCard } from "@/components/dashboard/PageHeader";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requirePage } from "@/server/auth";
import { getReport, type ReportRange } from "@/server/reports";

export const metadata = { title: "Reports" };

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
];

export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  await requirePage("reports.view");
  const { range: rangeParam } = await props.searchParams;
  const range = RANGES.find((r) => r.value === rangeParam)?.value ?? "7d";
  const report = await getReport(range);
  const rangeLabel = RANGES.find((r) => r.value === range)!.label;

  return (
    <>
      <PageHeader
        title="Reports"
        description="From real orders. Sales include paid orders only; cancelled orders are excluded. Times are Philippine time."
      />
      <div className="space-y-8 px-4 py-8 sm:px-8">
        <section aria-label="Sales summary" className="grid gap-4 sm:grid-cols-3">
          <StatCard accent label="Today's Sales" value={formatPeso(report.summary.today.salesCents)} hint={`${report.summary.today.orders} orders`} />
          <StatCard label="Last 7 days" value={formatPeso(report.summary.week.salesCents)} hint={`${report.summary.week.orders} orders`} />
          <StatCard label="This month" value={formatPeso(report.summary.month.salesCents)} hint={`${report.summary.month.orders} orders`} />
        </section>

        <nav aria-label="Report period" className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/admin/reports?range=${r.value}`}
              aria-current={r.value === range ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                r.value === range ? "border-espresso-900 bg-espresso-900 text-gold-200" : "border-cream-300 bg-white hover:border-gold-500",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <section aria-label={`${rangeLabel} totals`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sales" value={formatPeso(report.totals.salesCents)} hint={rangeLabel} />
          <StatCard label="Total orders" value={report.totals.orders} hint="Paid, not cancelled" />
          <StatCard label="Average order" value={report.totals.orders ? formatPeso(report.totals.averageCents) : "—"} />
          <StatCard label="Cancelled" value={report.cancelledOrders} hint="Orders in this period" />
        </section>

        {range !== "today" && (
          <section className="card p-6" aria-labelledby="daily-title">
            <h2 id="daily-title" className="display text-2xl">
              Daily sales
            </h2>
            <p className="mb-6 text-sm text-ink-muted">{rangeLabel}</p>
            <SalesChart series={report.series} />
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-labelledby="top-products-title">
            <h2 id="top-products-title" className="display mb-5 text-2xl">
              Best-selling products
            </h2>
            <RankedBars
              rows={report.topProducts.map((p) => ({ label: p.name, value: p.quantity, detail: formatPeso(p.salesCents) }))}
              formatValue={(v) => `${v} sold`}
              secondary={(r) => r.detail}
              emptyText="No products sold in this period."
            />
          </section>
          <section className="card p-6" aria-labelledby="top-categories-title">
            <h2 id="top-categories-title" className="display mb-5 text-2xl">
              Best-selling categories
            </h2>
            <RankedBars
              rows={report.topCategories.map((c) => ({ label: c.name, value: c.salesCents, detail: `${c.quantity} item${c.quantity === 1 ? "" : "s"}` }))}
              formatValue={formatPeso}
              secondary={(r) => r.detail}
              emptyText="No sales in this period."
            />
          </section>
        </div>

        <section className="card p-6" aria-labelledby="payments-title">
          <h2 id="payments-title" className="display mb-5 text-2xl">
            Payment methods
          </h2>
          <RankedBars
            rows={report.paymentBreakdown.map((p) => ({
              label: PAYMENT_METHOD_LABEL[p.method],
              value: p.salesCents,
              detail: `${p.orders} order${p.orders === 1 ? "" : "s"}`,
            }))}
            formatValue={formatPeso}
            secondary={(r) => r.detail}
            emptyText="No paid orders in this period."
          />
        </section>
      </div>
    </>
  );
}
