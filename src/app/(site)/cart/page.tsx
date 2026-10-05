import type { Metadata } from "next";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { CartContents } from "@/components/cart/CartContents";

export const metadata: Metadata = { title: "Your Order" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeading as="h1" eyebrow="Cart" hour={3} title="Your Order" />
      <div className="mt-8">
        <CartContents variant="page" />
      </div>
    </div>
  );
}
