import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@/db/schema";

/** All dates are shown in the shop's local time. */
export const SHOP_TIME_ZONE = "Asia/Manila";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: SHOP_TIME_ZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: SHOP_TIME_ZONE,
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: SHOP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const formatDate = (d: Date | string) => dateFormatter.format(new Date(d));
export const formatShortDate = (d: Date | string) => shortDateFormatter.format(new Date(d));
export const formatTime = (d: Date | string) => timeFormatter.format(new Date(d));
export const formatDateTime = (d: Date | string) => `${formatShortDate(d)}, ${formatTime(d)}`;
/** YYYY-MM-DD in shop time. */
export const shopDateKey = (d: Date | string = new Date()) => isoDateFormatter.format(new Date(d));

/** Midnight (shop time, UTC+8 — the Philippines has no DST) for a YYYY-MM-DD key. */
export function shopMidnight(dateKey: string = shopDateKey()): Date {
  return new Date(`${dateKey}T00:00:00+08:00`);
}

export function greetingForNow(now = new Date()): string {
  const hour = Number(hourFormatter.format(now));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeout: "Takeout",
  pickup: "Pickup",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  card: "Card",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  voided: "Voided",
};

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
