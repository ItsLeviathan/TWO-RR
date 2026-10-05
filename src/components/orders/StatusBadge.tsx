import type { OrderStatus, PaymentStatus } from "@/db/schema";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-warning-50 text-warning-600 ring-warning-600/25",
  preparing: "bg-info-50 text-info-600 ring-info-600/25",
  ready: "bg-gold-100 text-gold-700 ring-gold-600/30",
  completed: "bg-success-50 text-success-600 ring-success-600/25",
  cancelled: "bg-cream-100 text-ink-muted ring-cream-400/50 line-through decoration-1",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("chip ring-1 ring-inset", statusStyles[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

const paymentStyles: Record<PaymentStatus, string> = {
  paid: "bg-success-50 text-success-600 ring-success-600/25",
  unpaid: "bg-warning-50 text-warning-600 ring-warning-600/25",
  voided: "bg-cream-100 text-ink-muted ring-cream-400/50",
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return <span className={cn("chip ring-1 ring-inset", paymentStyles[status], className)}>{PAYMENT_STATUS_LABEL[status]}</span>;
}
