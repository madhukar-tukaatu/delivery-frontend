import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "./contact-form";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata = {
  title: "Contact Tukaatu Express",
};

export default function ContactPage() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="site-grid bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">Contact</p>
            <h1 className="site-display mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">Let's talk delivery.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Questions about a shipment, business delivery, franchise or coverage? Send us a message.</p>
          </div>
        </section>

        <section className="px-6 py-14 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[.75fr_1.25fr]">
            <div className="rounded-[2rem] bg-[#0b1220] p-8 text-white sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">Get in touch</p>
              <h2 className="site-display mt-4 text-3xl font-extrabold">We are here to help.</h2>
              <div className="mt-9 space-y-6">
                <Info Icon={MapPin} title="Office" text="Kathmandu, Nepal" />
                <Info Icon={Phone} title="Phone" text="+977 01-XXXXXXX" />
                <Info Icon={Mail} title="Email" text="hello@tukaatuexpress.com" />
              </div>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Info({ Icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="rounded-xl bg-white/10 p-3 text-cyan-300"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-200">{text}</p>
      </div>
    </div>
  );
}
