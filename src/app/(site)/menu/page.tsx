import type { Metadata } from "next";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { Notice } from "@/components/ui/states";
import { getMenu } from "@/server/menu";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Menu",
  description: "The TWO RR menu: coffee, non-coffee drinks, food and pastries. Order ahead online.",
};

export default async function MenuPage(props: PageProps<"/menu">) {
  const { category } = await props.searchParams;
  const [settings, menu] = await Promise.all([getSettings(), getMenu()]);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <SectionHeading
        as="h1"
        eyebrow={`${settings.businessName} menu`}
        title="What are you having?"
        description="Tap anything to see sizes and add-ons."
      />
      {!settings.onlineOrderingEnabled && (
        <Notice className="mt-6" tone="warning">
          Online ordering is paused right now — you can still browse the menu and order at the counter.
        </Notice>
      )}
      <div className="mt-8">
        <MenuBrowser
          categories={menu}
          orderingEnabled={settings.onlineOrderingEnabled}
          initialCategory={typeof category === "string" ? category : undefined}
        />
      </div>
    </div>
  );
}
