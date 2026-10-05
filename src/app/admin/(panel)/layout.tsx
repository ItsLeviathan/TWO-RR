import type { Metadata } from "next";
import { inArray, count } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { AdminShell } from "@/components/dashboard/AdminShell";
import { ToastProvider } from "@/components/ui/Toast";
import { requirePage } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · TWO RR" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("pos.use");
  const db = await getDb();
  const [settings, [open]] = await Promise.all([
    getSettings(),
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(inArray(schema.orders.status, ["pending", "preparing", "ready"])),
  ]);
  return (
    <ToastProvider>
      <AdminShell user={user} businessName={settings.businessName} logoUrl={settings.logoUrl} openOrders={open?.n ?? 0}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
