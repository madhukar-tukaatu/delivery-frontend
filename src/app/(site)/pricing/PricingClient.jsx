"use client";

import { useState, useEffect } from "react";
import PublicHero from "../components/PublicHero";
import PricingCalculator from "./pricing-calculator";

export default function PricingClient() {
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    const origHtml = document.documentElement.style.overflowX;
    const origBody = document.body.style.overflowX;
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
    return () => {
      document.documentElement.style.overflowX = origHtml;
      document.body.style.overflowX = origBody;
    };
  }, []);

  const handleOpenCalculator = () => {
    setShowCalculator(true);
    setTimeout(() => {
      const el = document.getElementById("calculator");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  return (
    <main className="public-page pricing-page bg-white w-full max-w-full overflow-x-hidden">
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
          className="px-2.5 py-4 sm:px-6 sm:py-12 lg:px-8 lg:py-16 w-full max-w-full overflow-x-hidden box-border"
          id="calculator"
        >
          <div className="mx-auto max-w-5xl mb-4 sm:mb-6 flex items-center justify-between gap-2 min-w-0 w-full">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#027196] block truncate">
                Instant Estimate
              </span>
              <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-[#0b1f33] mt-0.5 sm:mt-1 break-words leading-tight">
                Delivery Fare Calculator
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCalculator(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-0"
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
