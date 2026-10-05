import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { EmptyState } from "@/components/ui/states";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeading as="h1" eyebrow="Checkout" hour={6} title="Almost there" />
      {settings.onlineOrderingEnabled ? (
        <CheckoutForm orderTypes={settings.orderTypes} paymentMethods={settings.paymentMethods} businessName={settings.businessName} />
      ) : (
        <EmptyState
          title="Online ordering is paused."
          description="Please order at the counter — we'd love to see you."
          action={
            <Link href="/menu" className="btn btn-outline">
              Back to Menu
            </Link>
          }
        />
      )}
    </div>
  );
}
