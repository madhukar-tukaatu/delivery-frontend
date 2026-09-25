import PublicHero from "../components/PublicHero";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export const metadata = { title: "About Tukaatu Express" };

export default function AboutPage() {
  return (
    <main className="public-page bg-white">
      {/* Hero */}
      <PublicHero
        backgroundImage="/images/experience/cinematic/door.webp"
        eyebrow="About Tukaatu"
        title="Built in Nepal."
        accent="Built around people."
        description="We connect people, local businesses and delivery teams through a dependable, technology-enabled logistics network."
        note="People first. Parcels always."
        primary={{ href: "/services", label: "Explore our services" }}
        secondary={{ href: "/contact", label: "Meet your delivery partner" }}
      />

      {/* Stats */}
      <section className="border-y border-gray-200 bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-8 text-center sm:grid-cols-3">
          {[
            ["Nepal", "Locally built"],
            ["Connected", "Growing network"],
            ["People", "At the heart of delivery"],
          ].map(([n, l]) => (
            <div key={n}>
              <p className="site-display text-4xl font-extrabold text-[#027196]">{n}</p>
              <p className="mt-2 text-sm font-semibold text-gray-600">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl public-panel p-10 sm:p-12 text-center text-white">
          <Zap className="mx-auto h-10 w-10 text-[#f5c518]" />
          <h2 className="site-display mt-5 text-4xl font-extrabold">Nepal delivered. Simply.</h2>
          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            A clear promise for customers and a clear operating principle for the team behind every shipment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/franchise"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-7 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors"
            >
              Apply as Partner <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
