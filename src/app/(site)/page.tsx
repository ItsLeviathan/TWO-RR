import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bean, ClockMark } from "@/components/branding/Ornaments";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { CafeStory } from "@/components/cafe3d/CafeStory";
import { ProductCard } from "@/components/products/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { isOptimizableImage } from "@/lib/utils";
import { getGalleryImages } from "@/server/gallery";
import { getFeaturedProducts, getMenu } from "@/server/menu";
import { ORDER_TYPE_LABEL } from "@/lib/format";
import { getSettings } from "@/server/settings";
import { aboutContent } from "@/lib/content";

export default async function HomePage() {
  const [settings, featured, gallery, menu] = await Promise.all([
    getSettings(),
    getFeaturedProducts(6),
    getGalleryImages(),
    getMenu({ includeUnavailable: false }),
  ]);
  const about = aboutContent(settings);

  const steps = [
    { hour: 12, title: "Choose", body: "Browse the menu and pick your size and add-ons." },
    { hour: 3, title: "Order ahead", body: "Tell us your name and whether it's dine-in, takeout or pickup." },
    { hour: 6, title: "Enjoy the moment", body: "Pay at the counter when you collect, then slow down and enjoy." },
  ];

  return (
    <>
      <CafeStory
        businessName={settings.businessName}
        tagline={settings.tagline}
        logoUrl={settings.logoUrl}
        orderingEnabled={settings.onlineOrderingEnabled}
        categories={menu.filter((c) => c.products.length > 0).map((c) => ({ name: c.name, slug: c.slug }))}
        orderTypeLabels={settings.onlineOrderingEnabled ? settings.orderTypes.map((t) => ORDER_TYPE_LABEL[t]) : []}
        featured={featured.map((p) => ({ name: p.name, slug: p.slug, priceCents: p.priceCents }))}
        visit={{ address: settings.address, openingHours: settings.openingHours, mapUrl: settings.mapUrl }}
      />

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="featured-title">
          <Reveal>
            <SectionHeading
              eyebrow="From the menu"
              title={<span id="featured-title">Picked for this moment</span>}
              description="A few things from our counter. The full menu has everything else."
              action={
                <Link href="/menu" className="btn btn-outline shrink-0 self-start md:self-auto">
                  Full Menu <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </Reveal>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featured.slice(0, 4).map((p) => (
              <li key={p.id} className="scroll-3d">
                <ProductCard product={p} orderingEnabled={settings.onlineOrderingEnabled} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* About teaser — walnut + parchment split, echoing the logo */}
      <section className="bg-cream-100" aria-labelledby="about-teaser-title">
        <div className="mx-auto grid max-w-7xl items-stretch gap-0 overflow-hidden lg:grid-cols-2">
          <div className="walnut-texture relative flex min-h-72 items-center justify-center px-8 py-16 text-center lg:min-h-[30rem]">
            <div className="absolute inset-6 rounded-[2rem] border border-gold-400/30" aria-hidden />
            <Reveal className="relative max-w-sm">
              <Bean className="mx-auto h-6 text-gold-400" />
              <p className="mt-6 font-display text-4xl italic leading-tight text-cream-50 sm:text-5xl">“{settings.tagline}”</p>
              <p className="eyebrow mt-6 text-gold-300">{settings.businessName}</p>
            </Reveal>
          </div>
          <div className="flex items-center px-6 py-16 sm:px-12 lg:px-16">
            <Reveal>
              <SectionHeading eyebrow="Our story" hour={3} title={<span id="about-teaser-title">{about.headline}</span>} />
              <p className="mt-6 line-clamp-6 whitespace-pre-line text-lg leading-relaxed text-ink-soft">{about.story}</p>
              <Link href="/about" className="btn btn-espresso mt-8">
                Discover {settings.businessName} <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* How ordering works — clock positions as steps */}
      {settings.onlineOrderingEnabled && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="how-title">
          <Reveal>
            <SectionHeading align="center" hour={9} eyebrow="Order ahead" title={<span id="how-title">Your order, on your time</span>} />
          </Reveal>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 100} className="card relative p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/40 bg-cream-50">
                  <ClockMark hour={step.hour} className="h-9 w-9 text-gold-600" />
                </div>
                <p className="eyebrow mt-5 text-gold-700">Step {i + 1}</p>
                <h3 className="display mt-2 text-3xl text-ink">{step.title}</h3>
                <p className="mt-3 text-ink-muted">{step.body}</p>
              </Reveal>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link href="/menu" className="btn btn-gold btn-lg">
              Start an Order <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="bg-espresso-900 py-20 lg:py-28" aria-labelledby="gallery-teaser-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <SectionHeading
                tone="dark"
                hour={6}
                eyebrow="Inside TWO RR"
                title={<span id="gallery-teaser-title">Moments at the shop</span>}
                action={
                  <Link href="/gallery" className="btn btn-outline-light shrink-0 self-start md:self-auto">
                    View Gallery <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            </Reveal>
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {gallery.slice(0, 4).map((img, i) => (
                <Reveal as="li" key={img.id} delay={i * 70} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-espresso-800">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                      unoptimized={!isOptimizableImage(img.url)}
                      className="object-cover transition duration-700 hover:scale-105"
                    />
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}

    </>
  );
}
