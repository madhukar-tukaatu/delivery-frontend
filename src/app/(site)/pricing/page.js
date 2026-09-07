import PricingCalculator from "./pricing-calculator";

export const metadata = {
  title: "Delivery Pricing",
  description: "Calculate Tukaatu Express delivery pricing in NPR.",
};

export default function PricingPage() {
  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#01547a] via-[#013f5c] to-[#002d42] px-6 py-24 text-white lg:px-8 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_0%,rgba(245,197,24,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/12 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            Transparent Pricing
          </div>
          <h1 className="site-display mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Know the price<br /><span className="text-[#f5c518]">before you ship.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
            Get instant delivery estimates based on route, service type, weight and parcel dimensions. Our pricing is fair, transparent, and calculated in real-time.
          </p>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="px-6 py-16 lg:px-8 lg:py-20" id="calculator">
        <PricingCalculator />
      </section>

      {/* Why Choose Section */}
      <section className="bg-gray-50 px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="site-display text-3xl font-extrabold text-gray-900 sm:text-4xl">How our pricing works</h2>
            <p className="mt-4 text-lg text-gray-600">Simple factors that determine your delivery cost</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "📍",
                title: "Route",
                desc: "Pickup and delivery cities determine base fare"
              },
              {
                icon: "⚡",
                title: "Service Type",
                desc: "Standard, Express, or Same-Day delivery options"
              },
              {
                icon: "⚖️",
                title: "Weight",
                desc: "Actual or volumetric weight, whichever is greater"
              },
              {
                icon: "📦",
                title: "Dimensions",
                desc: "Length, width, height for accurate calculation"
              }
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:shadow-md hover:border-[#027196]/30">
                <div className="text-4xl">{item.icon}</div>
                <h3 className="mt-4 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <h2 className="site-display text-3xl font-extrabold text-gray-900 sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-12 space-y-6">
            {[
              {
                q: "Can I negotiate pricing?",
                a: "Our pricing is fixed and transparent. For bulk shipments or long-term partnerships, contact us for special rates."
              },
              {
                q: "What is volumetric weight?",
                a: "Volumetric weight is calculated as (Length × Width × Height) ÷ 5000. We charge based on whichever is higher: actual weight or volumetric weight."
              },
              {
                q: "Are there any hidden charges?",
                a: "No. The price you see in the calculator is the final price. No hidden fees, surcharges, or taxes applied at checkout."
              },
              {
                q: "How long is the quote valid?",
                a: "Price estimates are valid for 24 hours from generation. After that, you'll need to recalculate to get the latest rate."
              },
              {
                q: "Do you offer discounts for regular shippers?",
                a: "Yes! Contact our team to discuss volume discounts and special rates for regular merchant partners."
              }
            ].map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900">{item.q}</h3>
                <p className="mt-2 text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#01547a] via-[#013f5c] to-[#002d42] px-6 py-20 text-white lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="site-display text-4xl font-extrabold">Ready to start shipping?</h2>
          <p className="mt-4 text-blue-100">Get instant quotes and reliable delivery across Nepal</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#calculator" className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-8 py-3 text-sm font-bold text-[#0a0a0a] hover:bg-[#ffd740] transition-colors">
              Calculate Now
            </a>
            <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
