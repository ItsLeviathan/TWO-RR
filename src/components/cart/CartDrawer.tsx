"use client";

import { Modal } from "@/components/ui/Modal";
import { CartContents } from "./CartContents";
import { useCart } from "./CartProvider";

/** The drawer is modal, so the only ways to navigate away are its own links — which close it. */
export function CartDrawer() {
  const { drawerOpen, setDrawerOpen } = useCart();
  return (
    <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Your Order" variant="sheet">
      <CartContents onNavigate={() => setDrawerOpen(false)} />
    </Modal>
  );
}
