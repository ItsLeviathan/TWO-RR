"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Receipt, type ReceiptBusiness, type ReceiptOrder } from "./Receipt";

const noopSubscribe = () => () => {};

/** The body-level container the print stylesheet keeps visible (created once, on the client). */
function getPrintRoot(): HTMLElement {
  let el = document.getElementById("receipt-print-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "receipt-print-root";
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Renders the receipt into a body-level print container and opens the browser's print dialog.
 * The print stylesheet (globals.css) hides the app UI; @page is sized to the configured paper
 * width so 58mm/80mm thermal printers that are installed as system printers print it correctly.
 */
export function PrintReceiptButton({
  order,
  business,
  className,
  label = "Print Receipt",
}: {
  order: ReceiptOrder;
  business: ReceiptBusiness;
  className?: string;
  label?: string;
}) {
  const root = useSyncExternalStore(noopSubscribe, getPrintRoot, () => null);

  return (
    <>
      <button type="button" className={cn("btn btn-espresso", className)} onClick={() => window.print()} disabled={!root}>
        <Printer className="h-4 w-4" /> {label}
      </button>
      {root &&
        createPortal(
          <>
            <style>{`@media print { @page { size: ${business.receiptWidthMm}mm auto; margin: 3mm 0; } }`}</style>
            <Receipt order={order} business={business} />
          </>,
          root,
        )}
    </>
  );
}
