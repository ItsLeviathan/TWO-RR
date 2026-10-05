import { PosApp } from "@/components/pos/PosApp";
import { can } from "@/lib/permissions";
import { requirePage } from "@/server/auth";
import { getMenu } from "@/server/menu";
import { getSettings } from "@/server/settings";

export default async function PosPage() {
  const user = await requirePage("pos.use");
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return (
    <PosApp
      menu={menu}
      user={{ name: user.name, canViewDashboard: can(user.role, "dashboard.view") }}
      orderTypes={settings.orderTypes}
      paymentMethods={settings.paymentMethods}
      business={{
        businessName: settings.businessName,
        address: settings.address,
        phone: settings.phone,
        receiptHeader: settings.receiptHeader,
        receiptFooter: settings.receiptFooter,
        receiptShowAddress: settings.receiptShowAddress,
        receiptShowPhone: settings.receiptShowPhone,
        receiptWidthMm: settings.receiptWidthMm,
      }}
      logoUrl={settings.logoUrl}
    />
  );
}
