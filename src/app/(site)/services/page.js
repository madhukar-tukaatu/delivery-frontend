import PublicHero from "../components/PublicHero";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

export const metadata = { title: "Delivery Services" };

export default function ServicesPage() {
  return (
    <main className="public-page bg-white">
      {/* Hero */}
      <PublicHero
        backgroundImage="/images/experience/cinematic/pickup.webp"
        eyebrow="Delivery services"
        title="Every parcel."
        accent="The right service."
        description="From everyday orders to time-sensitive parcels, find a delivery service that fits your business and your customer."
        note="A better journey for every parcel."
        primary={{ href: "/pricing", label: "Get a quote" }}
        secondary={{ href: "/contact", label: "Book a pickup" }}
      />

      {/* Stats strip */}
      <section className="border-y border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              ["Connected", "Nepal-wide network"],
              ["Trackable", "Delivery updates"],
              ["Visible", "Proof of delivery"],
            ].map(([stat, label]) => (
              <div key={stat}>
                <p className="site-display text-4xl font-extrabold text-[#027196]">{stat}</p>
                <p className="mt-2 text-sm font-semibold text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="public-panel px-4 py-16 sm:px-6 lg:px-8 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <Star className="h-8 w-8 text-[#f5c518]" />
          <h2 className="site-display text-4xl font-extrabold">Ready to start shipping?</h2>
          <p className="max-w-xl text-blue-100">Give your customers a dependable delivery experience with Tukaatu Express.</p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
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
              Enquiry
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
