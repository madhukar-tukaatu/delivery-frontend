import Header from "../components/Header";
import Footer from "../components/Footer";
import SectionHeading from "../components/section-heading";
import { CheckCircle2, Eye, HeartHandshake, Target, Users } from "lucide-react";

export const metadata = {
  title: "About Tukaatu Express",
};

export default function AboutPage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="About Tukaatu Express"
            title="Making delivery feel simple."
            text="Tukaatu Express is built around a simple idea: logistics should be easier to understand, easier to operate and easier to trust."
          />
        </section>

        <section className="px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-[#0b1220] p-8 text-white sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">Our mission</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">Connect Nepal through dependable delivery.</h2>
              <p className="mt-5 leading-8 text-slate-300">
                We are building a technology-enabled logistics network that connects people, businesses, branches, hubs and riders around one clear shipment journey.
              </p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 p-8 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Our promise</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">Visibility without complexity.</h2>
              <p className="mt-5 leading-8 text-slate-600">
                Every part of the customer experience should answer the same question: what happens next? From pricing and tracking to delivery and settlement, we keep the experience straightforward.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="What guides us" title="Principles behind the network." />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                [Target, "Reliability", "Do the basics exceptionally well, every day."],
                [Eye, "Visibility", "Make shipment progress understandable."],
                [HeartHandshake, "Trust", "Treat every parcel and customer interaction with care."],
                [Users, "Community", "Build local operations that strengthen the wider network."],
              ].map(([Icon, title, text]) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="site-display mt-5 text-3xl font-extrabold">Nepal delivered. Simply.</h2>
            <p className="mt-4 leading-7 text-slate-600">A clear promise for customers and a clear operating principle for the team behind every shipment.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
