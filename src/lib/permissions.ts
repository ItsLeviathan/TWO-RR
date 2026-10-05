import type { UserRole } from "@/db/schema";

/**
 * Single source of truth for what each role may do. Server guards (`requireRole`, page guards)
 * and the navigation both read from here, so the UI never offers something the server refuses.
 *
 * Owner  — everything.
 * Staff  — cashier: POS, recent orders, payments, receipts, read-only product list, own account.
 */
export const PERMISSIONS = {
  "dashboard.view": ["owner"],
  "pos.use": ["owner", "staff"],
  "orders.viewRecent": ["owner", "staff"],
  "orders.viewAll": ["owner"],
  "orders.updateStatus": ["owner", "staff"],
  "orders.cancelPaid": ["owner"],
  "payments.record": ["owner", "staff"],
  "products.view": ["owner", "staff"],
  "products.manage": ["owner"],
  "categories.manage": ["owner"],
  "inventory.manage": ["owner"],
  "reports.view": ["owner"],
  "gallery.manage": ["owner"],
  "settings.manage": ["owner"],
  "users.manage": ["owner"],
  "account.manageOwn": ["owner", "staff"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

/** Where each role lands after signing in (and when sent away from a page it can't open). */
export function homeFor(role: UserRole): string {
  return role === "owner" ? "/admin" : "/admin/pos";
}

export const ROLE_LABEL: Record<UserRole, string> = { owner: "Owner", staff: "Cashier" };
