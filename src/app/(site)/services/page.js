import Header from "../components/header";
import Footer from "../components/footer";
import SectionHeading from "../components/section-heading";
import Link from "next/link";
import { ArrowRight, Clock3, Package, RefreshCcw, ShieldCheck, Truck, Zap } from "lucide-react";

export const metadata = {
  title: "Delivery Services",
};

const services = [
  {
    id: "standard",
    icon: Package,
    title: "Standard Delivery",
    tag: "Everyday shipping",
    text: "A dependable option for regular parcels where reliability and predictable movement matter most.",
    points: ["Door-to-door delivery", "Shipment tracking", "Multiple destination zones", "COD available"],
  },
  {
    id: "express",
    icon: Zap,
    title: "Express Delivery",
    tag: "Priority movement",
    text: "Move time-sensitive shipments through a priority service designed for faster delivery.",
    points: ["Priority handling", "Faster transit", "Live tracking", "Business support"],
  },
  {
    id: "same-day",
    icon: Clock3,
    title: "Same Day Delivery",
    tag: "Selected locations",
    text: "For urgent local shipments where getting the parcel there today makes a difference.",
    points: ["Same-day service areas", "Pickup scheduling", "Proof of delivery", "Customer notifications"],
  },
  {
    id: "cod",
    icon: ShieldCheck,
    title: "COD & Settlement",
    tag: "Built for commerce",
    text: "Collect cash on delivery and keep settlement visibility connected to your shipment operations.",
    points: ["COD collection", "Transaction visibility", "Settlement tracking", "Business reporting"],
  },
];

export default function ServicesPage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="Our services"
            title="One delivery network. Multiple ways to move."
            text="Choose the service that fits your shipment, customer promise and business workflow."
          />
        </section>

        <section className="px-6 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl space-y-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <article
                  id={service.id}
                  key={service.id}
                  className="site-card scroll-mt-28 grid gap-8 rounded-[2rem] p-7 sm:p-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center"
                >
                  <div className={index % 2 ? "lg:order-2" : ""}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">{service.tag}</p>
                    <h2 className="site-display mt-3 text-3xl font-extrabold">{service.title}</h2>
                    <p className="mt-4 max-w-xl leading-7 text-slate-600">{service.text}</p>
                  </div>
                  <div className={index % 2 ? "lg:order-1" : ""}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {service.points.map((point) => (
                        <div key={point} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                            <ShieldCheck className="h-4 w-4" />
                          </span>
                          {point}
                        </div>
                      ))}
                    </div>
                    <Link href="/site/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
                      Talk to our team <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-[#0b1220] px-6 py-20 text-white lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">Need a custom workflow?</p>
              <h2 className="site-display mt-3 text-3xl font-extrabold">We can build delivery around your business.</h2>
              <p className="mt-3 max-w-2xl text-slate-400">Talk to Tukaatu about integrations, high-volume shipping and tailored logistics operations.</p>
            </div>
            <Link href="/site/business" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950">
              Business solutions <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
