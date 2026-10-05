import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Visit & Contact" };

export default async function ContactPage() {
  const s = await getSettings();
  const items = [
    { icon: MapPin, label: "Address", value: s.address, href: s.mapUrl, linkLabel: "Get directions" },
    { icon: Clock, label: "Opening hours", value: s.openingHours },
    { icon: Phone, label: "Phone", value: s.phone, href: s.phone ? `tel:${s.phone.replace(/[^+\d]/g, "")}` : null, linkLabel: "Call us" },
    { icon: Mail, label: "Email", value: s.email, href: s.email ? `mailto:${s.email}` : null, linkLabel: "Send an email" },
  ].filter((i) => i.value);
  const socials = [
    { label: "Facebook", href: s.facebookUrl },
    { label: "Instagram", href: s.instagramUrl },
    { label: "TikTok", href: s.tiktokUrl },
  ].filter((x): x is { label: string; href: string } => Boolean(x.href));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeading as="h1" hour={9} eyebrow="Visit" title={`Find ${s.businessName}`} />
      {items.length === 0 ? (
        <div className="card mt-10 p-8 text-center">
          <p className="display text-3xl">Details coming soon.</p>
          <p className="mt-3 text-ink-muted">Our address, hours and contact information will be posted here shortly.</p>
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map(({ icon: Icon, label, value, href, linkLabel }) => (
            <li key={label} className="card flex gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-cream-100 text-gold-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="eyebrow text-gold-700">{label}</h2>
                <p className="mt-2 whitespace-pre-line break-words text-lg text-ink">{value}</p>
                {href && (
                  <a
                    href={href}
                    {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="mt-2 inline-block text-sm font-semibold text-gold-700 underline-offset-4 hover:underline"
                  >
                    {linkLabel}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {socials.length > 0 && (
        <div className="mt-10">
          <h2 className="eyebrow text-gold-700">Follow along</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {socials.map((x) => (
              <li key={x.label}>
                <a href={x.href} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  {x.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
