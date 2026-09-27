import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  DollarSign,
  HelpCircle,
  Percent,
  Scale,
  ShieldAlert,
} from "lucide-react";

export const metadata = {
  title: "Delivery Pricing Information - Tukaatu Express",
  description:
    "Transparent pricing rules, weight slabs, COD remittance fees, and volumetric calculations for shipping across Nepal.",
};

const pricingTiers = [
  {
    tier: "Local (Inside Ring Road)",
    basePrice: "Rs. 70",
    firstKg: "First 1 kg included",
    additionalKg: "+ Rs. 30 per additional kg",
    transit: "Same Day / Next Day",
    bestFor: "E-commerce stores and local parcel deliveries within Kathmandu Valley.",
  },
  {
    tier: "Suburbs (Outside Ring Road)",
    basePrice: "Rs. 100",
    firstKg: "First 1 kg included",
    additionalKg: "+ Rs. 40 per additional kg",
    transit: "24 Hours",
    bestFor: "Bhaktapur, Lalitpur semi-urban zones, Budhanilkantha, Kirtipur.",
  },
  {
    tier: "Major Cities (Hub-to-Hub)",
    basePrice: "Rs. 140",
    firstKg: "First 1 kg included",
    additionalKg: "+ Rs. 60 per additional kg",
    transit: "24 – 48 Hours",
    bestFor: "Pokhara, Biratnagar, Narayangarh, Butwal, Birgunj, Dharan, Nepalgunj.",
  },
  {
    tier: "Remote & Hill Districts",
    basePrice: "Rs. 200",
    firstKg: "First 1 kg included",
    additionalKg: "+ Rs. 80 per additional kg",
    transit: "48 – 72 Hours",
    bestFor: "Far-western, mountain districts, and branch pickup destinations.",
  },
];

export default function PricingInfoPage() {
  return (
    <main className="public-page bg-white min-h-screen">
      {/* Header */}
      <section className="border-b border-gray-200 bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#1677b8] hover:underline mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Pricing Calculator
          </Link>
          <span className="block text-xs font-bold uppercase tracking-widest text-[#1677b8]">
            Pricing Information
          </span>
          <h1 className="site-display mt-2 text-3xl sm:text-4xl font-extrabold text-[#0b1f33]">
            Transparent Shipping Rates in NPR
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            No surprise fuel surcharges or hidden convenience fees. Clear weight
            slabs and fast automated COD payouts for Nepali businesses.
          </p>
        </div>
      </section>

      {/* Slabs Grid */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="site-display text-3xl font-extrabold text-[#0b1f33]">
              Standard Weight & Distance Slabs
            </h2>
            <p className="mt-2 text-slate-600">
              Rates apply to standard volumetric parcels. Use the interactive calculator for precise door-to-door quotations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((p) => (
              <div
                key={p.tier}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">{p.tier}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#1677b8]">
                      {p.basePrice}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      / base
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2 text-xs font-medium text-slate-600 border-t border-gray-100 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1677b8]" /> {p.firstKg}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1677b8]" /> {p.additionalKg}
                    </li>
                    <li className="flex items-center gap-2 text-slate-700 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Transit: {p.transit}
                    </li>
                  </ul>
                  <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                    {p.bestFor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules & Policy Breakdown */}
      <section className="bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 lg:py-16 border-t border-gray-200">
        <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-7 border border-gray-200 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1677b8] flex items-center justify-center mb-4">
              <Scale className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900">Volumetric Weight</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              If a parcel is large but light, chargeable weight is calculated as:
              <br />
              <code className="bg-slate-100 px-2 py-1 rounded font-mono text-[11px] inline-block my-2 text-slate-800">
                (Length × Width × Height in cm) / 5000
              </code>
              <br />
              The higher of actual weight or volumetric weight is charged.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-7 border border-gray-200 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Percent className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900">COD Settlement Fee</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Cash on Delivery (COD) collection is settled to the merchant's verified bank account on a bi-weekly schedule. Standard COD handling fee is 1% of the collected cash value.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-7 border border-gray-200 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <Calculator className="h-5 w-5" />
            </div>
            <h4 className="font-extrabold text-base text-gray-900">High-Volume Discount</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Merchants shipping over 100 parcels per month qualify for tier-based discounts, zero COD fees, and dedicated pickup dispatch windows.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="px-4 py-12 text-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-xl bg-[#f4c542] px-7 py-3 text-sm font-bold text-[#0b1f33] hover:bg-[#ffda62] transition-colors"
        >
          Open Interactive Rate Calculator <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
