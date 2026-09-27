"use client";

import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import PricingCalculator from "./pricing-calculator";

export default function PricingClient() {
  return (
    <main className="public-page bg-slate-50 min-h-screen">
      {/* Hero Section with Live Calculator directly visible */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef6fa] via-white to-slate-50 border-b border-gray-200 pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero Header Copy */}
          <div className="max-w-3xl mb-8">
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/" className="hover:text-slate-800">
                Tukaatu Express
              </Link>
              <span>/</span>
              <span>Pricing & calculator</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-[#027196]/10 text-[#027196]">
                <Calculator className="h-3.5 w-3.5" /> Instant Delivery Fare Calculator
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 hidden sm:inline-block">
                Live NPR Rates
              </span>
            </div>

            <h1 className="site-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0b1f33] tracking-tight leading-[1.08]">
              Know the price.
              <br />
              <span className="text-[#1677b8]">Then make your move.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Choose your origin, destination, service level and parcel weight for
              an instant door-to-door delivery estimate across Nepal.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/pricing/info"
                className="inline-flex items-center gap-2 rounded-xl bg-[#f4c542] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[#0b1f33] hover:bg-[#ffd740] transition-colors"
              >
                Pricing Info & Weight Slabs <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Talk to our team
              </Link>
            </div>
          </div>

          {/* Calculator Card - Visible directly in the hero section */}
          <div className="mt-4">
            <PricingCalculator />
          </div>
        </div>
      </section>
    </main>
  );
}
