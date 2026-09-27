import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import ContactForm from "../contact-form";
import "../contact.css";

export const metadata = {
  title: "Contact Information & Support Details - Tukaatu Express",
  description:
    "Direct contact details, dispatch hub locations, operational hours, and customer care for Tukaatu Express Nepal.",
};

const FAQS = [
  {
    q: "How fast do dispatch teams respond?",
    a: "Our customer and dispatch teams typically respond within 15 minutes during operating hours (7:00 AM – 9:00 PM).",
  },
  {
    q: "Can I request regular merchant parcel pickups?",
    a: "Yes. Registered merchants on the Tukaatu platform can schedule daily scheduled pickups directly from their store dashboard.",
  },
  {
    q: "Where do you operate across Nepal?",
    a: "We provide intra-city express within Kathmandu Valley and inter-district express connections to all 7 provinces.",
  },
];

export default function ContactInfoPage() {
  return (
    <main className="public-page bg-white min-h-screen">
      {/* Header Bar */}
      <section className="border-b border-gray-200 bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#1677b8] hover:underline mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Contact Overview
          </Link>
          <span className="block text-xs font-bold uppercase tracking-widest text-[#1677b8]">
            Customer Support & Operations
          </span>
          <h1 className="site-display mt-2 text-3xl sm:text-4xl font-extrabold text-[#0b1f33]">
            Direct Contact & Dispatch Hub
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Reach our routing team, request a pickup, or resolve delivery
            milestones. We're here to keep your parcels moving without delays.
          </p>
        </div>
      </section>

      {/* Main Grid: Details + Form */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12">
          {/* Left Column: Direct Info Cards (5 cols) */}
          <aside className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#0b1f33] to-[#163a5f] p-8 text-white shadow-md">
              <span className="text-xs font-bold uppercase tracking-widest text-[#f4c542]">
                Central Hub
              </span>
              <h2 className="site-display mt-3 text-2xl font-extrabold">
                Kathmandu Operations Desk
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Operating 6 days a week to support riders, merchants and
                recipients across Nepal.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#f4c542] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs uppercase text-slate-400">
                      Head Office
                    </strong>
                    <span className="text-sm font-medium text-white">
                      Kathmandu Valley, Nepal
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#f4c542] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs uppercase text-slate-400">
                      General & Support Email
                    </strong>
                    <a
                      href="mailto:hello@tukaatuexpress.com"
                      className="text-sm font-medium text-white hover:underline"
                    >
                      hello@tukaatuexpress.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[#f4c542] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs uppercase text-slate-400">
                      Dispatch Hours
                    </strong>
                    <span className="text-sm font-medium text-white">
                      Sun – Fri: 7:00 AM – 9:00 PM
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  Verified Dispatch Hub
                </div>
                <Link
                  href="/tracking"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f4c542] hover:underline"
                >
                  <PackageSearch className="h-3.5 w-3.5" /> Track parcel →
                </Link>
              </div>
            </div>

            {/* Merchant Pickup Callout */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1677b8]">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Need Regular Pickups?
                  </h3>
                  <p className="text-xs text-gray-500">
                    Connect your shop or warehouse for automated dispatch.
                  </p>
                </div>
              </div>
              <a
                href="https://store.tukaatu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full rounded-xl bg-gray-100 py-2.5 text-center text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors"
              >
                Access Store Portal →
              </a>
            </div>
          </aside>

          {/* Right Column: Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Send our team a message
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below. We'll reply via email or phone promptly.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="p-8 text-center text-gray-500">
                  Loading form...
                </div>
              }
            >
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="border-t border-gray-200 bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#1677b8]">
              Quick Answers
            </span>
            <h2 className="site-display mt-2 text-2xl font-extrabold text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#1677b8] mb-3">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
