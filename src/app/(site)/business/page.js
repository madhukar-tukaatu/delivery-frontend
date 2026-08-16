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
  title: "Sell More. Deliver Better — Tukaatu Express for Merchants",
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
    text: "Every parcel tracked in real time — your team and your customers always know exactly where their order is.",
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
    text: "Automated invoices, reconciled settlement records and exportable delivery activity — all in one place.",
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
    text: "Our team reviews your application and activates your account — usually within 24 hours.",
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
    <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#050d1a] px-6 py-24 text-white lg:px-8 lg:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,rgba(245,197,24,0.14),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            <Store className="h-3.5 w-3.5" /> For Merchants
          </div>
          <h1 className="site-display mt-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Sell more.
            <br />
            <span className="text-[#f5c518]">Deliver better.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Tukaatu Express gives merchants across Nepal a complete delivery
            infrastructure — live tracking, POD collection, settlement reporting
            and a nationwide network — all from one platform.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
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
          <div className="mt-12 flex flex-wrap gap-6">
            {[
              [Zap, "Express delivery available"],
              [Shield, "Insured shipments"],
              [Clock, "Real-time tracking"],
              [TrendingUp, "Automatic settlement"],
            ].map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm font-semibold text-slate-400"
              >
                <Icon className="h-4 w-4 text-[#f5c518]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

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
      <section className="px-6 py-20 lg:px-8 lg:py-28">
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
      <section className="bg-[#050d1a] px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
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
      <section className="bg-[#050d1a] px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center text-white">
          <Store className="mx-auto h-10 w-10 text-[#f5c518]" />
          <h2 className="site-display mt-5 text-4xl font-extrabold">
            Ready to grow your business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Join hundreds of merchants already delivering across Nepal with Tukaatu Express.
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
