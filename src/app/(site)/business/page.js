import PublicHero from "../components/PublicHero";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Code2,
  FileText,
  Headphones,
  Zap,
  Shield,
  Clock,
  Store,
  TrendingUp,
  Wallet,
  PackageCheck,
  Globe,
  Star,
} from "lucide-react";

export const metadata = {
  title: "Sell More. Deliver Better - Tukaatu Express for Merchants",
  description:
    "Join Tukaatu Express as a merchant. Get reliable delivery, live tracking, POD collection and full settlement visibility across Nepal.",
};

const capabilities = [
  {
    icon: Boxes,
    title: "Bulk order management",
    text: "Create and dispatch high volumes of shipments from your dashboard without losing visibility on any order.",
  },
  {
    icon: PackageCheck,
    title: "Live shipment tracking",
    text: "Every parcel tracked in real time - your team and your customers always know exactly where their order is.",
  },
  {
    icon: Wallet,
    title: "POD & settlement",
    text: "Collect payment on delivery and receive automatic settlement reports tied to each shipment.",
  },
  {
    icon: BarChart3,
    title: "Performance analytics",
    text: "Monitor delivery rates, SLA compliance, COD collection and volume trends from a single dashboard.",
  },
  {
    icon: Code2,
    title: "API & integrations",
    text: "Connect your store, ERP or platform directly to Tukaatu via REST API. Automate order creation end-to-end.",
  },
  {
    icon: FileText,
    title: "Invoicing & billing",
    text: "Automated invoices, reconciled settlement records and exportable delivery activity - all in one place.",
  },
  {
    icon: Headphones,
    title: "Dedicated support",
    text: "A merchant support team available to help your operations run smoothly every day.",
  },
  {
    icon: Globe,
    title: "Nationwide coverage",
    text: "Deliver to all 7 provinces of Nepal through one connected network of branches, hubs and riders.",
  },
];

const steps = [
  {
    n: "01",
    title: "Register your merchant account",
    text: "Fill in your business details at our merchant registration portal. Takes under 5 minutes.",
  },
  {
    n: "02",
    title: "Get verified & approved",
    text: "Our team reviews your application and activates your account - usually within 24 hours.",
  },
  {
    n: "03",
    title: "Configure your delivery zones",
    text: "Set your pickup locations, preferred service types and delivery preferences.",
  },
  {
    n: "04",
    title: "Start creating shipments",
    text: "Use the dashboard or API to create shipments, print labels and dispatch orders.",
  },
  {
    n: "05",
    title: "Track, collect & settle",
    text: "Monitor every delivery, collect POD payments and receive automatic settlement reports.",
  },
];

const plans = [
  {
    name: "Starter",
    tag: "For new merchants",
    price: "Pay per shipment",
    features: [
      "Up to 100 shipments/month",
      "Standard delivery",
      "Live tracking",
      "POD collection",
      "Dashboard access",
    ],
    cta: "Register free",
    href: "/public/merchant-register",
    highlight: false,
  },
  {
    name: "Business",
    tag: "Most popular",
    price: "Volume pricing",
    features: [
      "Unlimited shipments",
      "Standard + Express",
      "Priority support",
      "API access",
      "Analytics dashboard",
      "Custom billing cycles",
    ],
    cta: "Register now",
    href: "/public/merchant-register",
    highlight: true,
  },
  {
    name: "Enterprise",
    tag: "High volume",
    price: "Custom pricing",
    features: [
      "Dedicated account manager",
      "Custom delivery zones",
      "SLA guarantees",
      "Full API suite",
      "White-label options",
      "On-site onboarding",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlight: false,
  },
];

export default function BusinessPage() {
  return (
    <main className="public-page">
      {/* ── Hero ── */}
      <PublicHero eyebrow="For merchants" title="Deliver more." accent="Worry less." description="Keep orders, delivery updates, COD collections and settlements in one clear view—so your team can focus on growing." note="Your next chapter, delivered." primary={{"href": "/public/merchant-register", "label": "Register as a merchant"}} secondary={{"href": "/contact", "label": "Talk to our merchant team"}} />

      {/* ── Stats bar ── */}
      {/* <section className="border-b border-slate-100 bg-white px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-5xl grid gap-8 text-center sm:grid-cols-4">
          {[
            ["10,000+", "Monthly shipments"],
            ["7 Provinces", "Nationwide reach"],
            ["48 hrs",  "Avg. delivery time"],
            ["99.2%",   "On-time rate"],
          ].map(([n, l]) => (
            <div key={n}>
              <p className="site-display text-4xl font-extrabold text-slate-900">{n}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ── Capabilities ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#c9a000]">
              Merchant platform
            </p>
            <h2 className="site-display mt-3 text-4xl font-extrabold">
              Everything your delivery operation needs.
            </h2>
            <p className="mt-4 text-slate-500">
              One platform for order creation, shipment visibility, POD
              collection and business reporting.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-[#f5c518]/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5c518]/12 text-[#c9a000] transition-colors group-hover:bg-[#f5c518] group-hover:text-[#0a0a0a]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-extrabold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="public-panel px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#f5c518]">
              Getting started
            </p>
            <h2 className="site-display mt-3 text-4xl font-extrabold text-white">
              Up and running in minutes.
            </h2>
            <p className="mt-4 text-slate-400">
              Register once and start shipping the same day.
            </p>
          </div>
          <div className="mt-12 space-y-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className="flex items-start gap-5 rounded-2xl bg-white/5 border border-white/8 p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5c518] text-xs font-extrabold text-[#0a0a0a]">
                  {step.n}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{step.text}</p>
                </div>
                {i === steps.length - 1 && (
                  <CheckCircle2 className="ml-auto mt-1 h-5 w-5 shrink-0 text-emerald-400" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/public/merchant-register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-8 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors"
            >
              Start your registration <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="public-panel px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center text-white">
          <Store className="mx-auto h-10 w-10 text-[#f5c518]" />
          <h2 className="site-display mt-5 text-4xl font-extrabold">
            Ready to grow your business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Bring your delivery operations together with Tukaatu Express.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/public/merchant-register"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-7 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors"
            >
              Register as merchant <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-colors"
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
