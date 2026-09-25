import PublicHero from "../components/PublicHero";
import Link from "next/link";
import { ArrowRight, Eye, HeartHandshake, Target, Users, Zap } from "lucide-react";

export const metadata = { title: "About Tukaatu Express" };

export default function AboutPage() {
  return (
    <main className="public-page bg-white">
      {/* Hero */}
      <PublicHero backgroundImage="/images/experience/cinematic/door.webp" eyebrow="About Tukaatu" title="Built in Nepal." accent="Built around people." description="We connect people, local businesses and delivery teams through a dependable, technology-enabled logistics network." note="People first. Parcels always." primary={{"href": "/services", "label": "Explore our services"}} secondary={{"href": "/contact", "label": "Meet your delivery partner"}} />

      {/* Mission + Promise */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24 bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl public-panel p-8 sm:p-10 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-[#f5c518]">Our mission</p>
            <h2 className="site-display mt-4 text-3xl font-extrabold">Connect Nepal through dependable delivery.</h2>
            <p className="mt-5 leading-8 text-blue-100">
              We are building a technology-enabled logistics network that connects people, businesses, branches, hubs and riders around one clear shipment journey.
            </p>
            <Link href="/services" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#f5c518] hover:text-[#ffd740] transition-colors">
              See our services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#027196]">Our promise</p>
            <h2 className="site-display mt-4 text-3xl font-extrabold text-gray-900">Visibility without complexity.</h2>
            <p className="mt-5 leading-8 text-gray-600">
              Every part of the customer experience should answer the same question: what happens next? From pricing and tracking to delivery and settlement, we keep it straightforward.
            </p>
            <Link href="/contact" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#027196] hover:text-[#0284c7] transition-colors">
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#027196]">What guides us</p>
            <h2 className="site-display mt-3 text-4xl font-extrabold text-gray-900">Principles behind the network.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              [Target,         "Reliability",  "Do the basics exceptionally well, every single day."],
              [Eye,            "Visibility",   "Make shipment progress clear and understandable."],
              [HeartHandshake, "Trust",        "Treat every parcel and customer interaction with care."],
              [Users,          "Community",    "Build local operations that strengthen the wider network."],
            ].map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#027196]/12 text-[#027196]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-extrabold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-8 text-center sm:grid-cols-3">
          {[["Nepal", "Locally built"], ["Connected", "Growing network"], ["People", "At the heart of delivery"]].map(([n, l]) => (
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
          <p className="mx-auto mt-4 max-w-xl text-blue-100">A clear promise for customers and a clear operating principle for the team behind every shipment.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/franchise" className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-7 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors">
              Apply as Partner <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
