"use client";

import { useState } from "react";
import PublicHero from "../components/PublicHero";
import PricingCalculator from "./pricing-calculator";

export default function PricingClient() {
  const [showCalculator, setShowCalculator] = useState(false);

  const handleOpenCalculator = () => {
    setShowCalculator(true);
    setTimeout(() => {
      const el = document.getElementById("calculator");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  return (
    <main className="public-page bg-white">
      {/* Hero Section */}
      <PublicHero
        backgroundImage="/images/experience/cinematic/store.webp"
        eyebrow="Pricing & calculator"
        title="Know the price."
        accent="Then make your move."
        description="Choose your route, service and parcel details for a delivery estimate in NPR."
        note="Clear pricing. Confident sending."
        fullHeight={!showCalculator}
        primary={{
          onClick: handleOpenCalculator,
          label: showCalculator ? "View calculator ↓" : "Calculate delivery",
        }}
        secondary={{ href: "/contact", label: "Talk to our team" }}
      />

      {/* Pricing Calculator - Appears only when user clicks the button */}
      {showCalculator && (
        <section
          className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
          id="calculator"
          style={{ animation: "fadeIn 0.3s ease-out" }}
        >
          <div className="mx-auto max-w-5xl mb-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#027196]">
                Instant Estimate
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b1f33] mt-1">
                Delivery Fare Calculator
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCalculator(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-0"
              aria-label="Close calculator"
            >
              Close ✕
            </button>
          </div>
          <PricingCalculator />
        </section>
      )}
    </main>
  );
}
