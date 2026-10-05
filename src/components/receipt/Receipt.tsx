import type { OrderItemSelections, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@/db/schema";
import { formatDate, formatTime, ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { describeSelection } from "@/lib/pricing";

export type ReceiptOrder = {
  orderNumber: number;
  createdAt: Date | string;
  customerName: string | null;
  orderType: OrderType;
  status: OrderStatus;
  notes: string | null;
  subtotalCents: number;
  totalCents: number;
  items: { id: string; productName: string; quantity: number; unitPriceCents: number; lineTotalCents: number; selections: OrderItemSelections }[];
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    tenderedCents: number | null;
    changeCents: number | null;
    reference: string | null;
  } | null;
};

export type ReceiptBusiness = {
  businessName: string;
  address: string | null;
  phone: string | null;
  receiptHeader: string | null;
  receiptFooter: string;
  receiptShowAddress: boolean;
  receiptShowPhone: boolean;
  receiptWidthMm: number;
};

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

/**
 * Thermal-printer receipt. Monospace, black on white, sized for 58mm or 80mm paper.
 * Only business details the owner entered in Settings are printed.
 */
export function Receipt({ order, business }: { order: ReceiptOrder; business: ReceiptBusiness }) {
  const narrow = business.receiptWidthMm === 58;
  return (
    <div
      className="receipt mx-auto bg-white font-mono text-black"
      style={{
        width: `${business.receiptWidthMm - (narrow ? 10 : 8)}mm`,
        fontSize: narrow ? "10.5px" : "12px",
        lineHeight: 1.35,
      }}
    >
      <div className="text-center">
        <p className="font-bold uppercase tracking-[0.2em]" style={{ fontSize: narrow ? "15px" : "18px" }}>
          {business.businessName}
        </p>
        <p className="uppercase tracking-[0.25em]">Coffee Shop</p>
        {business.receiptShowAddress && business.address && <p className="mt-1 whitespace-pre-line">{business.address}</p>}
        {business.receiptShowPhone && business.phone && <p>{business.phone}</p>}
        {business.receiptHeader && <p className="mt-1 whitespace-pre-line">{business.receiptHeader}</p>}
      </div>

      <div className="mt-3">
        <p className="font-bold">Order #{order.orderNumber}</p>
        <p>{formatDate(order.createdAt)}</p>
        <p>{formatTime(order.createdAt)}</p>
        <p>
          {ORDER_TYPE_LABEL[order.orderType]}
          {order.customerName ? ` · ${order.customerName}` : ""}
        </p>
      </div>

      <Divider />
      {order.items.map((item) => {
        const summary = describeSelection(item.selections.options, item.selections.addons);
        return (
          <div key={item.id} className="mb-1.5">
            <p>
              {item.quantity} × {item.productName}
            </p>
            {summary && <p className="pl-3">{summary}</p>}
            <p className="text-right tabular-nums">{formatPeso(item.lineTotalCents)}</p>
          </div>
        );
      })}
      <Divider />

      <Row left="Subtotal" right={formatPeso(order.subtotalCents)} />
      <Row left="TOTAL" right={formatPeso(order.totalCents)} bold />

      {order.payment && (
        <div className="mt-2">
          <p>
            Payment: {PAYMENT_METHOD_LABEL[order.payment.method]}
            {order.payment.status !== "paid" ? ` (${order.payment.status.toUpperCase()})` : ""}
          </p>
          {order.payment.method === "cash" && order.payment.tenderedCents !== null && (
            <>
              <Row left="Cash:" right={formatPeso(order.payment.tenderedCents)} />
              <Row left="Change:" right={formatPeso(order.payment.changeCents ?? 0)} />
            </>
          )}
          {order.payment.reference && <p>Ref: {order.payment.reference}</p>}
        </div>
      )}
      {order.status === "cancelled" && <p className="mt-2 text-center font-bold">*** CANCELLED ***</p>}
      {order.notes && <p className="mt-2">Notes: {order.notes}</p>}

      <Divider />
      <p className="mt-2 whitespace-pre-line text-center">{business.receiptFooter}</p>
    </div>
  );
}
