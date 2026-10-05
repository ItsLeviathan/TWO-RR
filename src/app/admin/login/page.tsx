import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { ClockRing, GoldRule } from "@/components/branding/Ornaments";
import { LoginForm } from "@/components/forms/LoginForm";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/permissions";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Staff Login", robots: { index: false, follow: false } };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const { next } = await props.searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const settings = await getSettings();
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-espresso-900 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgb(227_194_126/0.18),transparent_60%)]" aria-hidden />
        <div className="relative w-[380px]">
          <ClockRing className="absolute -inset-[10%] h-[120%] w-[120%]" />
          <Logo src={settings.logoUrl} size={380} priority className="relative h-auto w-full drop-shadow-[0_30px_45px_rgb(0_0_0/0.55)]" />
        </div>
      </div>
      <div className="flex items-center justify-center bg-cream-50 px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <Logo src={settings.logoUrl} size={84} priority className="h-auto w-[84px] lg:hidden" alt="" />
            <p className="mt-4 font-caps text-2xl font-semibold tracking-[0.2em] text-ink">{settings.businessName}</p>
            <GoldRule className="mt-4 w-32" />
            <h1 className="display mt-5 text-4xl text-ink">Staff Login</h1>
            <p className="mt-1 text-sm text-ink-muted">For owners and cashiers</p>
          </div>
          <LoginForm next={typeof next === "string" ? next : ""} />
          <p className="mt-8 text-center text-sm text-ink-muted">
            <Link href="/" className="font-medium text-gold-700 hover:underline">
              ← Back to the website
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
