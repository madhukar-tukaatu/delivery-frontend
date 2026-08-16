import Header from "../components/Header";
import Footer from "../components/Footer";
import Link from "next/link";
import SectionHeading from "../components/section-heading";
import { BarChart3, Boxes, CheckCircle2, Code2, FileText, Headphones, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Business Logistics",
};

const capabilities = [
  [Boxes, "Bulk shipping", "Create and manage large shipment volumes without losing operational visibility."],
  [Code2, "API integration", "Connect your store, ERP or internal systems to a delivery workflow."],
  [BarChart3, "Analytics", "Understand shipment volume, delivery performance, COD and business trends."],
  [FileText, "Billing & invoices", "Keep invoices, settlements and delivery activity easier to reconcile."],
  [Headphones, "Business support", "Get operational support for your team and customers."],
  [CheckCircle2, "Proof of delivery", "Keep delivery confirmation connected to each shipment."],
];

export default function BusinessPage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-[#0b1220] px-6 py-20 text-white lg:px-8 lg:py-28">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="relative mx-auto max-w-7xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-cyan-400">For businesses</p>
            <h1 className="site-display mt-5 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl">
              Delivery infrastructure for businesses that are ready to scale.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Give customers a dependable delivery experience while your team gets the tools to manage shipments, COD and performance.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-700">
                Start shipping <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/site/contact" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/5">
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Business toolkit"
              title="Everything your delivery operation needs."
              text="A connected experience for order creation, shipment visibility and delivery operations."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(([Icon, title, text]) => (
                <div key={title} className="site-card site-card-hover rounded-3xl p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-8 shadow-sm sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Built for your team</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">From order to settlement.</h2>
              <div className="mt-8 space-y-4">
                {["Create shipments", "Track every movement", "Manage COD", "Review performance", "Reconcile billing"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-blue-600 p-8 text-white sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Ready when you are</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">Let's design the right delivery setup.</h2>
              <p className="mt-4 leading-7 text-blue-100">Whether you're shipping dozens or thousands of parcels, our team can help you choose the right workflow.</p>
              <Link href="/site/contact" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700">
                Contact sales <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
