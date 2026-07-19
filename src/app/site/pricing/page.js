// app/pricing/page.js
import Link from "next/link";
import Header from "../components/header";

export default function Pricing() {
  return (
    <>
      <Header />
      <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        <h1 className="text-6xl font-bold text-center mb-4">
          Simple & Transparent Pricing
        </h1>
        <p className="text-center text-gray-600 text-xl mb-16">
          No hidden fees. Pay only for what you use.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="border border-gray-200 rounded-3xl p-8">
            <h3 className="text-2xl font-semibold">Starter</h3>
            <p className="text-5xl font-bold mt-6">
              ₹50 <span className="text-base font-normal">/delivery</span>
            </p>
            <ul className="mt-8 space-y-4">
              <li>✓ Standard Delivery</li>
              <li>✓ Live Tracking</li>
              <li>✓ Basic Support</li>
            </ul>
            <Link
              href="/login"
              className="block mt-10 text-center py-4 border rounded-2xl font-semibold"
            >
              Get Started
            </Link>
          </div>

          {/* Business Plan */}
          <div className="border-2 border-blue-600 rounded-3xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1 rounded-full text-sm">
              Most Popular
            </div>
            <h3 className="text-2xl font-semibold">Business</h3>
            <p className="text-5xl font-bold mt-6">
              ₹35 <span className="text-base font-normal">/delivery</span>
            </p>
            <ul className="mt-8 space-y-4">
              <li>✓ Same Day Delivery</li>
              <li>✓ POD Settlement</li>
              <li>✓ Priority Support</li>
              <li>✓ Bulk Discounts</li>
            </ul>
            <Link
              href="/login"
              className="block mt-10 text-center py-4 bg-blue-600 text-white rounded-2xl font-semibold"
            >
              Choose Business
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="border border-gray-200 rounded-3xl p-8">
            <h3 className="text-2xl font-semibold">Enterprise</h3>
            <p className="text-5xl font-bold mt-6">Custom</p>
            <ul className="mt-8 space-y-4">
              <li>✓ API Integration</li>
              <li>✓ Dedicated Account Manager</li>
              <li>✓ Custom Solutions</li>
              <li>✓ Volume Discounts</li>
            </ul>
            <a
              href="/contact"
              className="block mt-10 text-center py-4 border rounded-2xl font-semibold"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
