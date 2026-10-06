import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Bean, GoldRule } from "@/components/branding/Ornaments";
import { AboutHero } from "@/components/cafe-story/AboutHero";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { aboutContent } from "@/lib/content";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const settings = await getSettings();
  const about = aboutContent(settings);

  return (
    <>
      <AboutHero>
        <SectionHeading as="h1" tone="dark" eyebrow={`About ${settings.businessName}`} title={about.headline} />
        <p className="mt-6 max-w-xl font-display text-2xl italic text-gold-300">{settings.tagline}</p>
      </AboutHero>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28" aria-labelledby="story-title">
        <Reveal>
          <p className="eyebrow flex items-center gap-2 text-gold-700">
            <Bean className="h-3 text-gold-600" /> Our story
          </p>
          <h2 id="story-title" className="sr-only">
            Our story
          </h2>
          <div className="mt-6 whitespace-pre-line text-xl leading-relaxed text-ink-soft first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:font-semibold first-letter:leading-[0.8] first-letter:text-walnut-700">
            {about.story}
          </div>
        </Reveal>

        {about.mission && (
          <Reveal className="mt-16">
            <GoldRule />
            <div className="py-10 text-center">
              <p className="eyebrow text-gold-700">Our mission</p>
              <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line font-display text-3xl leading-snug text-ink">{about.mission}</p>
            </div>
            <GoldRule />
          </Reveal>
        )}

        <Reveal className="mt-16 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/menu" className="btn btn-gold btn-lg">
            Explore the Menu <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" className="btn btn-outline btn-lg">
            Visit Us
          </Link>
        </Reveal>
      </section>
    </>
  );
}
