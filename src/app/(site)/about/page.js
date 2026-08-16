import Link from "next/link";
import { ArrowRight, Eye, HeartHandshake, Target, Users, Zap } from "lucide-react";

export const metadata = { title: "About Tukaatu Express" };

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050d1a] px-6 py-24 text-white lg:px-8 lg:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(245,197,24,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            About Tukaatu Express
          </div>
          <h1 className="site-display mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Making delivery<br /><span className="text-[#f5c518]">feel simple.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Tukaatu Express is built around one idea: logistics should be easier to understand, easier to operate and easier to trust.
          </p>
        </div>
      </section>

      {/* Mission + Promise */}
      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-[#050d1a] p-10 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-[#f5c518]">Our mission</p>
            <h2 className="site-display mt-4 text-3xl font-extrabold">Connect Nepal through dependable delivery.</h2>
            <p className="mt-5 leading-8 text-slate-400">
              We are building a technology-enabled logistics network that connects people, businesses, branches, hubs and riders around one clear shipment journey.
            </p>
            <Link href="/services" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#f5c518] hover:text-[#ffd740] transition-colors">
              See our services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[2rem] border border-slate-100 bg-white p-10 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c9a000]">Our promise</p>
            <h2 className="site-display mt-4 text-3xl font-extrabold">Visibility without complexity.</h2>
            <p className="mt-5 leading-8 text-slate-500">
              Every part of the customer experience should answer the same question: what happens next? From pricing and tracking to delivery and settlement, we keep it straightforward.
            </p>
            <Link href="/contact" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#c9a000] hover:text-[#f5c518] transition-colors">
              Get in touch <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[#050d1a] px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#f5c518]">What guides us</p>
            <h2 className="site-display mt-3 text-4xl font-extrabold text-white">Principles behind the network.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              [Target,         "Reliability",  "Do the basics exceptionally well, every single day."],
              [Eye,            "Visibility",   "Make shipment progress clear and understandable."],
              [HeartHandshake, "Trust",        "Treat every parcel and customer interaction with care."],
              [Users,          "Community",    "Build local operations that strengthen the wider network."],
            ].map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/5 p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5c518]/15 text-[#f5c518]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-extrabold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 bg-white px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-5xl grid gap-8 text-center sm:grid-cols-3">
          {[["2020", "Founded in Nepal"], ["7 Provinces", "Nationwide coverage"], ["10,000+", "Parcels delivered monthly"]].map(([n, l]) => (
            <div key={n}>
              <p className="site-display text-4xl font-extrabold text-slate-900">{n}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-[#050d1a] p-12 text-center text-white">
          <Zap className="mx-auto h-10 w-10 text-[#f5c518]" />
          <h2 className="site-display mt-5 text-4xl font-extrabold">Nepal delivered. Simply.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">A clear promise for customers and a clear operating principle for the team behind every shipment.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/public/merchant-register" className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-7 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors">
              Join as merchant <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-colors">
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
