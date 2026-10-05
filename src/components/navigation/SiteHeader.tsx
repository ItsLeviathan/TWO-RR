"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu as MenuIcon, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Visit" },
];

export function SiteHeader({ businessName, logoUrl, orderingEnabled }: { businessName: string; logoUrl: string | null; orderingEnabled: boolean }) {
  const pathname = usePathname();
  const { count, hydrated, setDrawerOpen, addPulse } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu on navigation; lock page scroll while it is open.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-gold-500/20 bg-espresso-900 text-cream-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label={`${businessName} home`}>
          <Logo src={logoUrl} size={44} priority className="h-11 w-auto transition-transform duration-500 group-hover:rotate-[8deg]" alt="" />
          <span className="font-caps text-lg font-semibold tracking-[0.18em] text-cream-50">{businessName}</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive(item.href) ? "text-gold-300" : "text-cream-200/80 hover:text-cream-50",
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-cream-100 transition hover:bg-white/10"
            aria-label={`Open your order${hydrated && count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {hydrated && count > 0 && (
              <span
                key={addPulse}
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-gold-400 px-1 text-[0.7rem] font-bold text-espresso-900"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
          {orderingEnabled && (
            <Link href="/menu" className="btn btn-gold btn-sm hidden sm:inline-flex">
              Order Now
            </Link>
          )}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="fixed inset-x-0 bottom-0 top-16 z-40 flex animate-fade-in flex-col bg-espresso-900 px-6 pb-10 pt-6 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((item, i) => (
              <li key={item.href} className="animate-fade-up border-b border-gold-500/15" style={{ animationDelay: `${i * 45}ms` }}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between py-4 font-display text-3xl",
                    isActive(item.href) ? "text-gold-300" : "text-cream-50",
                  )}
                >
                  {item.label}
                  <span className="font-caps text-xs tracking-[0.3em] text-gold-500/70">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
          {orderingEnabled && (
            <Link href="/menu" className="btn btn-gold btn-lg mt-8">
              Order Now
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
