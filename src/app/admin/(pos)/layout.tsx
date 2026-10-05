import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { requirePage } from "@/server/auth";

export const metadata: Metadata = { title: "POS", robots: { index: false, follow: false } };

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  await requirePage("pos.use");
  return <ToastProvider>{children}</ToastProvider>;
}
