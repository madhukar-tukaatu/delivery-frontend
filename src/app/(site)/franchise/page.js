import Header from "../components/header";
import Footer from "../components/footer";
import Link from "next/link";
import SectionHeading from "../components/section-heading";
import { ArrowRight, Building2, CheckCircle2, MapPinned, TrendingUp, Users } from "lucide-react";

export const metadata = {
  title: "Franchise Opportunity",
};

export default function FranchisePage() {
  const benefits = [
    [MapPinned, "Choose your territory", "Explore available areas and build a local delivery operation."],
    [Building2, "Launch with a network", "Operate as part of a connected Tukaatu branch and hub network."],
    [Users, "Build your team", "Grow your local operation with riders and operational staff."],
    [TrendingUp, "Scale with demand", "Track shipments, revenue and delivery performance as you grow."],
  ];

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-[#0b1220] px-6 py-20 text-white lg:px-8 lg:py-28">
          <div className="absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-400">Franchise with Tukaatu</p>
            <h1 className="site-display mt-5 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl">
              Build the delivery network in your community.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Bring Tukaatu Express to your territory and build a local logistics business backed by a nationwide delivery brand and technology platform.
            </p>
            <Link href="/site/franchise/apply" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950">
              Explore franchise application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Why Tukaatu" title="A franchise built around local execution." text="Combine local market knowledge with a structured logistics operating model." />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map(([Icon, title, text]) => (
                <div key={title} className="site-card rounded-3xl p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_.9fr]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Application journey</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">A clear path from application to launch.</h2>
              <div className="mt-8 space-y-4">
                {["Submit application", "Under review", "Interview & territory assessment", "Approval & agreement", "Branch setup", "Go live"].map((step, index) => (
                  <div key={step} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">{index + 1}</div>
                    <span className="text-sm font-bold">{step}</span>
                    <CheckCircle2 className="ml-auto h-4 w-4 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Interested?</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">Tell us about your territory.</h2>
              <p className="mt-4 leading-7 text-slate-600">Start with the areas you want to operate and our franchise team can guide you through the next steps.</p>
              <Link href="/site/franchise/apply" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
