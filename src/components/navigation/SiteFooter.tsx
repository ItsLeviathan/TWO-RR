import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { GoldRule } from "@/components/branding/Ornaments";
import type { BusinessSettings } from "@/server/settings";

export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  const socials = [
    { label: "Facebook", href: settings.facebookUrl },
    { label: "Instagram", href: settings.instagramUrl },
    { label: "TikTok", href: settings.tiktokUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="relative overflow-hidden bg-espresso-900 text-cream-200">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-4">
              <Logo src={settings.logoUrl} size={72} className="h-[74px] w-auto" alt="" />
              <div>
                <p className="font-caps text-xl font-semibold tracking-[0.2em] text-cream-50">{settings.businessName}</p>
                <p className="mt-1 font-display text-lg italic text-gold-300">{settings.tagline}</p>
              </div>
            </div>
            {socials.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light btn-sm">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="eyebrow text-gold-400">Explore</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ["/menu", "Menu"],
                ["/about", "About"],
                ["/gallery", "Gallery"],
                ["/contact", "Visit"],
                ["/cart", "Your Order"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="text-cream-200/80 transition hover:text-gold-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-gold-400">Visit</h2>
            <div className="mt-4 space-y-3 text-sm text-cream-200/80">
              {settings.address ? <p className="whitespace-pre-line">{settings.address}</p> : null}
              {settings.openingHours ? <p className="whitespace-pre-line">{settings.openingHours}</p> : null}
              {settings.phone ? (
                <p>
                  <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="hover:text-gold-300">
                    {settings.phone}
                  </a>
                </p>
              ) : null}
              {settings.email ? (
                <p>
                  <a href={`mailto:${settings.email}`} className="hover:text-gold-300">
                    {settings.email}
                  </a>
                </p>
              ) : null}
              {!settings.address && !settings.openingHours && !settings.phone && !settings.email && (
                <p>Location and hours will be posted here soon.</p>
              )}
            </div>
          </div>
        </div>

        <GoldRule className="mt-14" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-cream-200/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </p>
          <Link href="/admin" className="hover:text-gold-300">
            Staff sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
