import Header from "../components/Header";
import Footer from "../components/Footer";
import PricingCalculator from "./pricing-calculator";

export const metadata = {
  title: "Delivery Pricing",
  description: "Calculate Tukaatu Express delivery pricing in NPR.",
};

export default function PricingPage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">
              Transparent pricing
            </p>
            <h1 className="site-display mt-4 text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
              Know the price before you ship.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Get a delivery estimate based on the route, service, weight and
              COD requirements. Final pricing is determined by our configured
              pricing engine.
            </p>
          </div>
        </section>
        <PricingCalculator />
      </main>
      <Footer />
    </div>
  );
}
