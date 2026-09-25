import PublicHero from "../components/PublicHero";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Franchise Opportunity - Tukaatu Express" };

const steps = [
  "Submit your application",
  "Initial review & screening",
  "Approval & franchise agreement",
  "Branch setup & training",
  "Go live",
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
            ["Branch + Hub", "Proven model"],
            ["Full support", "From day one"],
          ].map(([n, l]) => (
            <div key={n}>
              <p className="site-display text-4xl font-extrabold text-[#027196]">{n}</p>
              <p className="mt-2 text-sm font-semibold text-gray-600">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application journey */}
      <section className="public-panel px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#f5c518]">Application journey</p>
            <h2 className="site-display mt-3 text-4xl font-extrabold text-white">A clear path from application to launch.</h2>
            <p className="mt-4 text-blue-100">We guide you through every step - from territory assessment to your first live delivery.</p>
            <div className="mt-8 space-y-3">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl bg-white/10 border border-white/20 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5c518] text-sm font-extrabold text-[#0a0a0a]">{i + 1}</div>
                  <span className="text-sm font-bold text-white">{step}</span>
                  {i === steps.length - 1 && <CheckCircle2 className="ml-auto h-5 w-5 text-green-400" />}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-lg sm:p-10 self-start">
            <p className="text-xs font-bold uppercase tracking-widest text-[#027196]">Ready to apply?</p>
            <h2 className="site-display mt-4 text-3xl font-extrabold text-gray-900">Tell us about your territory.</h2>
            <p className="mt-4 leading-7 text-gray-600">Start with the areas you want to operate. Our franchise team will guide you through the next steps.</p>
            <ul className="mt-6 space-y-2">
              {[
                "No prior logistics experience required",
                "Full training provided",
                "Technology platform included",
                "Ongoing operational support",
              ].map((pt) => (
                <li key={pt} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#027196]" />
                  {pt}
                </li>
              ))}
            </ul>
            <Link
              href="/franchise/apply"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-6 py-3.5 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors"
            >
              Start your application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
