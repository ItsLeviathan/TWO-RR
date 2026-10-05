import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { GoldRule } from "@/components/branding/Ornaments";

export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-espresso-900 px-6 text-center text-cream-100">
      <Logo size={120} className="h-auto w-[120px]" alt="TWO RR" />
      <p className="eyebrow mt-8 text-gold-400">404</p>
      <h1 className="display mt-3 text-5xl text-cream-50">This moment doesn&apos;t exist.</h1>
      <GoldRule className="mt-6 w-40" />
      <p className="mt-6 max-w-md text-cream-200/75">The page you were looking for may have moved.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn btn-gold">
          Back to Home
        </Link>
        <Link href="/menu" className="btn btn-outline-light">
          View Menu
        </Link>
      </div>
    </main>
  );
}
