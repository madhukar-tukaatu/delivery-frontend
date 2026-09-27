import PublicHero from "../components/PublicHero";
import Link from "next/link";
import { ArrowRight, Clock3, Package, ShieldCheck, Zap, CheckCircle2, Star } from "lucide-react";

export const metadata = { title: "Delivery Services - Tukaatu Express" };

const services = [
  {
    id: "standard",
    icon: Package,
    color: "blue",
    title: "Standard Delivery",
    tag: "Everyday shipping",
    text: "Reliable door-to-door delivery across Nepal. The backbone of our network - consistent, trackable and built for high-volume merchant shipments.",
    points: [
      "Door-to-door delivery across 77 districts",
      "Real-time shipment tracking with SMS updates",
      "Reliable 24-48 hr hub movement",
      "Proof of delivery (POD) with digital signature",
    ],
    cta: "Calculate rates",
    ctaHref: "/pricing",
  },
  {
    id: "express",
    icon: Zap,
    color: "yellow",
    title: "Express Delivery",
    tag: "Priority movement",
    text: "When speed matters. Express moves your shipment to the front of the queue with priority handling, dedicated routing and expedited transit.",
    points: [
      "Priority queue handling at all branches",
      "Expedited transit between hubs",
      "Real-time GPS tracking and alerts",
      "Dedicated priority merchant support",
    ],
    cta: "Get express rates",
    ctaHref: "/pricing",
  },
  {
    id: "same-day",
    icon: Clock3,
    color: "teal",
    title: "Same Day Delivery",
    tag: "Selected locations",
    text: "Same-day service for urgent local shipments within Kathmandu Valley and major metropolitan clusters. Ideal for time-critical orders.",
    points: [
      "Same-day dispatch and handover",
      "Scheduled merchant pickup windows",
      "Live rider location updates",
      "Immediate delivery confirmation",
    ],
    cta: "Check availability",
    ctaHref: "/contact",
  },
  {
    id: "pod",
    icon: ShieldCheck,
    color: "blue-dark",
    title: "POD & Cash Settlement",
    tag: "Built for commerce",
    text: "Collect cash on delivery safely and keep every transaction tied to its shipment. Automated reconciliation and regular payout settlements.",
    points: [
      "Secure cash on delivery collection",
      "Transparent ledger and transaction logs",
      "Regular automated merchant bank payout",
      "Digital remittance reports in merchant portal",
    ],
    cta: "Register as merchant",
    ctaHref: "/public/merchant-register",
  },
];

const colorMap = {
  blue: { bg: "bg-[#027196]/12", text: "text-[#027196]", badge: "bg-[#027196]/15 text-[#01547a]" },
  yellow: { bg: "bg-[#f5c518]/12", text: "text-[#c9a000]", badge: "bg-[#f5c518]/15 text-[#8a6e00]" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", badge: "bg-teal-100 text-teal-700" },
  "blue-dark": { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
};

export default function ServicesPage() {
  return (
    <main className="public-page bg-white">
      {/* Hero */}
      <PublicHero
        backgroundImage="/images/experience/cinematic/pickup.webp"
        eyebrow="Delivery services"
        title="Every parcel."
        accent="The right service."
        description="From everyday store orders to time-sensitive urgent parcels, find a delivery service that fits your business, your budget and your customers."
        note="A better journey for every parcel."
        primary={{ href: "/pricing", label: "Calculate price" }}
        secondary={{ href: "/contact", label: "Book a pickup" }}
      />

      {/* Services List Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1677b8]">
              What We Offer
            </span>
            <h2 className="site-display mt-2 text-3xl sm:text-4xl font-extrabold text-[#0b1f33]">
              Specialized logistics for Nepal
            </h2>
            <p className="mt-3 text-slate-600">
              Each service is tailored with dedicated SLA, tracking, and pricing to meet your personal or business shipping needs.
            </p>
          </div>

          {services.map((service, i) => {
            const Icon = service.icon;
            const c = colorMap[service.color];
            return (
              <div
                key={service.id}
                id={service.id}
                className="group grid gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg lg:grid-cols-2 scroll-mt-24"
              >
                <div className={`p-8 sm:p-10 ${i % 2 ? "lg:order-2" : ""}`}>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${c.badge}`}>
                    {service.tag}
                  </span>
                  <div className={`mt-5 flex h-14 w-14 items-center justify-center rounded-2xl ${c.bg} ${c.text}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="site-display mt-5 text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {service.title}
                  </h3>
                  <p className="mt-3 leading-7 text-gray-600">{service.text}</p>
                  <Link
                    href={service.ctaHref}
                    className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${c.text} hover:underline`}
                  >
                    {service.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={`bg-gray-50 p-8 sm:p-10 border-l border-gray-200 ${i % 2 ? "lg:order-1" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Service Features
                  </p>
                  <ul className="mt-5 space-y-3">
                    {service.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-3 text-sm font-semibold text-gray-700">
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
      <section className="border-y border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            {[
              ["Connected", "Nepal-wide network"],
              ["Trackable", "Live status updates"],
              ["Visible", "Digital proof of delivery"],
            ].map(([stat, label]) => (
              <div key={stat}>
                <p className="site-display text-4xl font-extrabold text-[#1677b8]">{stat}</p>
                <p className="mt-2 text-sm font-semibold text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
