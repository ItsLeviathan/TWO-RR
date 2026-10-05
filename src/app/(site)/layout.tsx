import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { getSettings } from "@/server/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <ToastProvider>
      <CartProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-espresso-900"
        >
          Skip to content
        </a>
        <SiteHeader
          businessName={settings.businessName}
          logoUrl={settings.logoUrl}
          orderingEnabled={settings.onlineOrderingEnabled}
        />
        <main id="main" className="min-h-[60vh]">
          {children}
        </main>
        <SiteFooter settings={settings} />
        <CartDrawer />
      </CartProvider>
    </ToastProvider>
  );
}
