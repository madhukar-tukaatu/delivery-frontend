import PublicHero from "../components/PublicHero";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPinned,
  TrendingUp,
  Users,
  DollarSign,
  Headphones,
} from "lucide-react";

export const metadata = { title: "Franchise Opportunity - Tukaatu Express" };

const benefits = [
  {
    icon: MapPinned,
    title: "Own your territory",
    text: "Secure an exclusive delivery zone and build a local logistics business with protected coverage.",
  },
  {
    icon: Building2,
    title: "Backed by the network",
    text: "Operate under the Tukaatu brand with full access to our technology, routes and support systems.",
  },
  {
    icon: Users,
    title: "Build your team",
    text: "Hire riders and staff with our operational playbook - we help you scale from day one.",
  },
  {
    icon: TrendingUp,
    title: "Grow with demand",
    text: "Track revenue, shipment volume and delivery performance as your territory grows.",
  },
  {
    icon: DollarSign,
    title: "Multiple revenue streams",
    text: "Earn from standard, express and same-day deliveries plus POD collection fees.",
  },
  {
    icon: Headphones,
    title: "Ongoing support",
    text: "Dedicated franchise support team, training resources and regular performance reviews.",
  },
];

const steps = [
  "Submit your application",
  "Initial review & territory screening",
  "Approval & franchise agreement",
  "Branch setup & operational training",
  "Go live on Tukaatu network",
];

export default function FranchisePage() {
  return (
    <main className="public-page bg-white">
      {/* Hero */}
      <PublicHero
        backgroundImage="/images/experience/cinematic/origin.webp"
        eyebrow="Partner with Tukaatu"
        title="Local knowledge."
        accent="Nationwide ambition."
        description="Build a delivery business in your community, supported by Tukaatu’s technology, operations and growing network."
        note="Your community. Our network."
        primary={{ href: "/franchise/apply", label: "Apply for a franchise" }}
        secondary={{ href: "/contact", label: "Ask a question" }}
      />

      {/* Stats */}
      <section className="border-b border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid gap-8 text-center sm:grid-cols-3">
          {[
            ["7 Provinces", "Open for franchise"],
            ["Branch + Hub", "Proven logistics model"],
            ["Full Support", "From onboarding to launch"],
          ].map(([n, l]) => (
            <div key={n}>
              <p className="site-display text-4xl font-extrabold text-[#1677b8]">{n}</p>
              <p className="mt-2 text-sm font-semibold text-gray-600">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Tukaatu Benefits */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1677b8]">
              Why Tukaatu
            </span>
            <h2 className="site-display mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">
              A franchise built for local execution.
            </h2>
            <p className="mt-4 text-gray-600">
              Combine your local market knowledge with a structured logistics operating model and a brand customers trust.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group rounded-2xl border border-gray-200 bg-white p-7 shadow-sm hover:border-[#f4c542] hover:-translate-y-1 hover:shadow-md transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1677b8]/12 text-[#1677b8] group-hover:bg-[#f4c542] group-hover:text-[#0b1f33] transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-extrabold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application journey */}
      <section className="public-panel px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#f4c542]">
              Application Journey
            </span>
            <h2 className="site-display mt-2 text-3xl sm:text-4xl font-extrabold text-white">
              A clear path from application to launch.
            </h2>
            <p className="mt-4 text-blue-100">
              We guide you through every step - from territory assessment to your first live delivery.
            </p>
            <div className="mt-8 space-y-3">
              {steps.map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl bg-white/10 border border-white/20 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4c542] text-sm font-extrabold text-[#0b1f33]">
                    {i + 1}
                  </div>
                  <span className="text-sm font-bold text-white">{step}</span>
                  {i === steps.length - 1 && (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-lg sm:p-10 self-start">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1677b8]">
              Ready to apply?
            </span>
            <h2 className="site-display mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Tell us about your territory.
            </h2>
            <p className="mt-4 leading-7 text-gray-600">
              Start with the areas you want to operate. Our franchise team will review your application and guide you through the next steps.
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "No prior logistics experience required",
                "Full operational training provided",
                "Technology platform included",
                "Ongoing operational support & playbooks",
              ].map((pt) => (
                <li key={pt} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1677b8]" />
                  {pt}
                </li>
              ))}
            </ul>
            <Link
              href="/franchise/apply"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f4c542] px-6 py-3.5 text-sm font-bold text-[#0b1f33] hover:bg-[#ffda62] transition-colors"
            >
              Start your application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
