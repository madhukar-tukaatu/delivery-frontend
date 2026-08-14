import PricingCalculator from "./pricing-calculator";

export const metadata = {
  title: "Delivery Pricing",
  description: "Calculate Tukaatu Express delivery pricing in NPR.",
};

export default function PricingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-[#050d1a] px-6 py-24 text-white lg:px-8 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(245,197,24,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            Transparent pricing
          </div>
          <h1 className="site-display mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
            Know the price<br /><span className="text-[#f5c518]">before you ship.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Get a delivery estimate based on the route, service, weight and parcel type. Final pricing is determined by our configured pricing engine.
          </p>
        </div>
      </section>
      <PricingCalculator />
    </main>
  );
}
