"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ChevronUp, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { ProductConfigurator } from "@/components/products/ProductConfigurator";
import type { ReceiptBusiness } from "@/components/receipt/Receipt";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { OrderType, PaymentMethod } from "@/db/schema";
import { formatTime } from "@/lib/format";
import { hasCustomizations, type MenuCategory, type MenuProduct } from "@/lib/menu-types";
import { formatPeso } from "@/lib/money";
import { logout } from "@/server/actions/auth";
import { PosOrderPanel } from "./PosOrderPanel";
import { PosPaymentDialog } from "./PosPaymentDialog";
import { PosProductGrid } from "./PosProductGrid";

export type PosLine = {
  key: string;
  product: MenuProduct;
  optionIds: string[];
  addonIds: string[];
  quantity: number;
  unitPriceCents: number;
  summary: string;
};

const sig = (productId: string, optionIds: string[], addonIds: string[]) =>
  `${productId}|${[...optionIds].sort().join(",")}|${[...addonIds].sort().join(",")}`;

export function PosApp({
  menu,
  user,
  orderTypes,
  paymentMethods,
  business,
  logoUrl,
}: {
  menu: MenuCategory[];
  user: { name: string; canViewDashboard: boolean };
  orderTypes: OrderType[];
  paymentMethods: PaymentMethod[];
  business: ReceiptBusiness;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [lines, setLines] = useState<PosLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>(orderTypes[0] ?? "dine_in");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [configuring, setConfiguring] = useState<{ product: MenuProduct; editKey?: string } | null>(null);
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  const now = useClock();

  const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  // Quantity already in the current order for a product (to respect tracked stock).
  const inOrder = (productId: string, exceptKey?: string) =>
    lines.filter((l) => l.product.id === productId && l.key !== exceptKey).reduce((n, l) => n + l.quantity, 0);

  function addLine(product: MenuProduct, optionIds: string[], addonIds: string[], quantity: number, unitPriceCents: number, summary: string, editKey?: string) {
    if (product.stockQuantity !== null && inOrder(product.id, editKey) + quantity > product.stockQuantity) {
      toast.show(`Only ${product.stockQuantity} ${product.name} in stock.`, "error");
      return;
    }
    setLines((current) => {
      const base = editKey ? current.filter((l) => l.key !== editKey) : current;
      const s = sig(product.id, optionIds, addonIds);
      const existing = base.find((l) => sig(l.product.id, l.optionIds, l.addonIds) === s);
      if (existing) {
        return base.map((l) => (l.key === existing.key ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l));
      }
      const line: PosLine = { key: editKey ?? crypto.randomUUID(), product, optionIds, addonIds, quantity, unitPriceCents, summary };
      if (editKey) {
        const index = current.findIndex((l) => l.key === editKey);
        const next = [...base];
        next.splice(Math.max(0, index), 0, line);
        return next;
      }
      return [...base, line];
    });
  }

  function onProductTap(product: MenuProduct) {
    if (!product.isOrderable) return;
    if (hasCustomizations(product)) setConfiguring({ product });
    else addLine(product, [], [], 1, product.priceCents, "");
  }

  function setQuantity(key: string, quantity: number) {
    setLines((current) =>
      current.map((l) => {
        if (l.key !== key) return l;
        const stock = l.product.stockQuantity;
        const others = current.filter((x) => x.product.id === l.product.id && x.key !== key).reduce((n, x) => n + x.quantity, 0);
        const max = stock !== null ? Math.max(1, stock - others) : 99;
        return { ...l, quantity: Math.max(1, Math.min(max, 99, quantity)) };
      }),
    );
  }

  function resetSale() {
    setLines([]);
    setCustomerName("");
    setNotes("");
    setOrderType(orderTypes[0] ?? "dine_in");
    setSaleKey(crypto.randomUUID());
    setPaying(false);
    setOrderSheetOpen(false);
    router.refresh(); // pick up new stock levels
  }

  const editingLine = configuring?.editKey ? lines.find((l) => l.key === configuring.editKey) : undefined;

  const panel = (idPrefix: string) => (
    <PosOrderPanel
      idPrefix={idPrefix}
      showTitle={idPrefix !== "pos-sheet"}
      lines={lines}
      totalCents={totalCents}
      orderTypes={orderTypes}
      orderType={orderType}
      onOrderType={setOrderType}
      customerName={customerName}
      onCustomerName={setCustomerName}
      notes={notes}
      onNotes={setNotes}
      onQuantity={setQuantity}
      onRemove={(key) => setLines((c) => c.filter((l) => l.key !== key))}
      onEdit={(line) => setConfiguring({ product: line.product, editKey: line.key })}
      onClear={() => {
        if (window.confirm("Clear the current order?")) setLines([]);
      }}
      onCharge={() => {
        setOrderSheetOpen(false);
        setPaying(true);
      }}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream-100">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-espresso-900 px-3 text-cream-100 sm:px-5">
        <Logo src={logoUrl} size={34} className="h-9 w-auto" alt="" />
        <p className="font-caps text-sm font-semibold tracking-[0.18em] sm:text-base">
          {business.businessName} <span className="text-gold-400">POS</span>
        </p>
        <time className="ml-3 hidden text-sm tabular-nums text-cream-200/70 md:block" suppressHydrationWarning>
          {now ? formatTime(now) : ""}
        </time>
        <nav aria-label="POS" className="ml-auto flex items-center gap-1">
          {user.canViewDashboard && (
            <Link href="/admin" className="btn btn-sm px-3 text-cream-100 hover:bg-white/10">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          <Link href="/admin/orders" className="btn btn-sm px-3 text-cream-100 hover:bg-white/10">
            <ClipboardList className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
          </Link>
          <span className="mx-2 hidden text-sm text-cream-200/60 lg:inline">{user.name}</span>
          <form action={logout}>
            <button type="submit" className="btn btn-sm px-3 text-cream-100 hover:bg-white/10" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col" aria-label="Products">
          <PosProductGrid menu={menu} onTap={onProductTap} quantityInOrder={(id) => inOrder(id)} />
        </section>
        <aside className="hidden w-[400px] shrink-0 border-l border-cream-300 bg-white lg:flex xl:w-[440px]" aria-label="Current order">
          {panel("pos-side")}
        </aside>
      </div>

      {/* Tablet / phone: order summary bar opens the order as a sheet */}
      <div className="shrink-0 border-t border-cream-300 bg-white p-3 lg:hidden">
        <button
          type="button"
          className="btn btn-espresso btn-lg w-full justify-between"
          onClick={() => setOrderSheetOpen(true)}
          disabled={lines.length === 0}
        >
          <span className="flex items-center gap-2">
            <ChevronUp className="h-5 w-5" /> Current Order · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums text-gold-200">{formatPeso(totalCents)}</span>
        </button>
      </div>
      <Modal open={orderSheetOpen} onClose={() => setOrderSheetOpen(false)} title="Current Order" variant="sheet" className="sm:max-w-lg">
        {panel("pos-sheet")}
      </Modal>

      <Modal
        open={configuring !== null}
        onClose={() => setConfiguring(null)}
        title={configuring?.product.name ?? "Options"}
        className="sm:max-w-xl"
      >
        {configuring && (
          <div className="overflow-y-auto px-5 pb-5">
            <p className="mb-4 text-lg font-semibold text-walnut-700">{formatPeso(configuring.product.priceCents)}</p>
            <ProductConfigurator
              key={configuring.editKey ?? configuring.product.id}
              compact
              product={configuring.product}
              initial={editingLine ? { optionIds: editingLine.optionIds, addonIds: editingLine.addonIds, quantity: editingLine.quantity } : undefined}
              submitLabel={(t) => `${editingLine ? "Update" : "Add"} · ${formatPeso(t)}`}
              onSubmit={(line) => {
                addLine(configuring.product, line.optionIds, line.addonIds, line.quantity, line.unitPriceCents, line.summary, configuring.editKey);
                setConfiguring(null);
              }}
            />
          </div>
        )}
      </Modal>

      {paying && (
        <PosPaymentDialog
          saleKey={saleKey}
          lines={lines}
          totalCents={totalCents}
          orderType={orderType}
          customerName={customerName}
          notes={notes}
          paymentMethods={paymentMethods}
          business={business}
          onClose={() => setPaying(false)}
          onNewSale={resetSale}
        />
      )}
    </div>
  );
}

/** Current time (minute precision), rendered only on the client to avoid a hydration mismatch. */
let clockMinute = 0;
function subscribeClock(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}
function getClockSnapshot() {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== clockMinute) clockMinute = minute;
  return clockMinute;
}
function useClock(): Date | null {
  const minute = useSyncExternalStore(subscribeClock, getClockSnapshot, () => 0);
  return minute ? new Date(minute * 60_000) : null;
}
