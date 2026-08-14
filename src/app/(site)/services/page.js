import Link from "next/link";
import { ArrowRight, Clock3, Package, ShieldCheck, Zap, CheckCircle2, Star } from "lucide-react";

export const metadata = { title: "Delivery Services" };

const services = [
  {
    id: "standard", icon: Package, color: "yellow",
    title: "Standard Delivery", tag: "Everyday shipping",
    text: "Reliable door-to-door delivery across Nepal. The backbone of our network — consistent, trackable and built for volume.",
    points: ["Door-to-door delivery", "Live shipment tracking", "Nationwide coverage", "POD available"],
    cta: "Start shipping",
  },
  {
    id: "express", icon: Zap, color: "amber",
    title: "Express Delivery", tag: "Priority movement",
    text: "When speed matters. Express moves your shipment to the front of the queue with priority handling at every stage.",
    points: ["Priority queue handling", "Faster transit times", "Real-time tracking", "Dedicated support"],
    cta: "Get express rates",
  },
  {
    id: "same-day", icon: Clock3, color: "emerald",
    title: "Same Day Delivery", tag: "Selected locations",
    text: "Same-day service for urgent local shipments. Available in select coverage zones — ideal for time-critical deliveries.",
    points: ["Same-day dispatch", "Scheduled pickup", "Proof of delivery", "Customer SMS alerts"],
    cta: "Check availability",
  },
  {
    id: "pod", icon: ShieldCheck, color: "purple",
    title: "POD & Settlement", tag: "Built for commerce",
    text: "Collect payment on delivery and keep every transaction tied to its shipment. Full settlement visibility for your business.",
    points: ["Payment on delivery", "Transaction records", "Settlement tracking", "Business reporting"],
    cta: "Learn more",
  },
];

const colorMap = {
  yellow:  { bg: "bg-[#f5c518]/12", text: "text-[#c9a000]",   badge: "bg-[#f5c518]/15 text-[#8a6e00]" },
  amber:   { bg: "bg-amber-50",     text: "text-amber-600",    badge: "bg-amber-100 text-amber-700" },
  emerald: { bg: "bg-emerald-50",   text: "text-emerald-600",  badge: "bg-emerald-100 text-emerald-700" },
  purple:  { bg: "bg-purple-50",    text: "text-purple-600",   badge: "bg-purple-100 text-purple-700" },
};

export default function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#050d1a] px-6 py-24 text-white lg:px-8 lg:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(245,197,24,0.12),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            Our Services
          </div>
          <h1 className="site-display mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            One network.<br /><span className="text-[#f5c518]">Every delivery.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            From everyday parcels to same-day urgent shipments — choose the service that fits your customer promise and business workflow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-6 py-3 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors">
              Calculate price <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors">
              Talk to our team
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl space-y-8">
          {services.map((service, i) => {
            const Icon = service.icon;
            const c = colorMap[service.color];
            return (
              <div key={service.id} id={service.id}
                className="group grid gap-0 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-2">
                <div className={`p-8 sm:p-10 ${i % 2 ? "lg:order-2" : ""}`}>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${c.badge}`}>{service.tag}</span>
                  <div className={`mt-5 flex h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="site-display mt-5 text-3xl font-extrabold">{service.title}</h2>
                  <p className="mt-3 leading-7 text-slate-500">{service.text}</p>
                  <Link href="/contact" className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${c.text}`}>
                    {service.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={`bg-slate-50 p-8 sm:p-10 ${i % 2 ? "lg:order-1" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">What's included</p>
                  <ul className="mt-5 space-y-3">
                    {service.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className={`h-5 w-5 shrink-0 ${c.text}`} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-100 bg-[#050d1a] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[["10,000+", "Parcels delivered monthly"], ["7 Provinces", "Nationwide coverage"], ["99.2%", "On-time delivery rate"]].map(([stat, label]) => (
              <div key={stat}>
                <p className="site-display text-4xl font-extrabold text-[#f5c518]">{stat}</p>
                <p className="mt-2 text-sm font-semibold text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#050d1a] px-6 py-20 text-white lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <Star className="h-8 w-8 text-[#f5c518]" />
          <h2 className="site-display text-4xl font-extrabold">Ready to start shipping?</h2>
          <p className="max-w-xl text-slate-400">Join hundreds of businesses already using Tukaatu Express to deliver across Nepal.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/business" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-colors">
              Business solutions
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
