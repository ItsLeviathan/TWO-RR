"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Coffee,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MonitorSmartphone,
  Settings,
  Tags,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import type { UserRole } from "@/db/schema";
import { can, homeFor, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: typeof Coffee; permission: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/pos", label: "POS", icon: MonitorSmartphone, permission: "pos.use" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, permission: "orders.viewRecent" },
  { href: "/admin/products", label: "Products", icon: Coffee, permission: "products.view" },
  { href: "/admin/categories", label: "Categories", icon: Tags, permission: "categories.manage" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, permission: "inventory.manage" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { href: "/admin/gallery", label: "Gallery", icon: Images, permission: "gallery.manage" },
  { href: "/admin/users", label: "Users", icon: UserCog, permission: "users.manage" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
  { href: "/admin/account", label: "My account", icon: UserRound, permission: "account.manageOwn" },
];

export function AdminShell({
  children,
  user,
  businessName,
  logoUrl,
  openOrders,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: UserRole };
  businessName: string;
  logoUrl: string | null;
  openOrders: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Owner" className="flex flex-1 flex-col">
      <ul className="space-y-1">
        {NAV.filter((item) => can(user.role, item.permission)).map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(href) ? "bg-gold-400/15 text-gold-200" : "text-cream-200/75 hover:bg-white/5 hover:text-cream-50",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", isActive(href) ? "text-gold-300" : "text-cream-200/50")} aria-hidden />
              {label}
              {href === "/admin/orders" && openOrders > 0 && (
                <span className="ml-auto rounded-full bg-gold-400 px-2 py-0.5 text-xs font-bold text-espresso-900">
                  {openOrders}
                  <span className="sr-only"> open orders</span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream-200/75 transition hover:bg-white/5 hover:text-cream-50"
        >
          <ExternalLink className="h-[18px] w-[18px] text-cream-200/50" aria-hidden /> View website
        </Link>
        <div className="px-3 pt-2">
          <p className="truncate text-sm font-semibold text-cream-50">{user.name}</p>
          <p className="truncate text-xs text-cream-200/50">
            {ROLE_LABEL[user.role]} · {user.email}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-cream-200/75 transition hover:bg-white/5 hover:text-cream-50"
          >
            <LogOut className="h-[18px] w-[18px] text-cream-200/50" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  const brand = (
    <Link href={homeFor(user.role)} className="flex items-center gap-3">
      <Logo src={logoUrl} size={40} className="h-10 w-auto" alt="" />
      <span>
        <span className="block font-caps text-base font-semibold tracking-[0.18em] text-cream-50">{businessName}</span>
        <span className="block text-[0.7rem] uppercase tracking-[0.2em] text-gold-400/80">{ROLE_LABEL[user.role]}</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh bg-cream-50 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 overflow-y-auto bg-espresso-900 px-4 py-6 lg:flex">
        {brand}
        {nav}
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-espresso-900 px-4 lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-cream-100 hover:bg-white/10"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div id="admin-mobile-nav" className="fixed inset-x-0 bottom-0 top-16 z-30 flex animate-fade-in flex-col overflow-y-auto bg-espresso-900 px-4 py-6 lg:hidden">
          {nav}
        </div>
      )}

      <div className="min-w-0">{children}</div>
    </div>
  );
}
