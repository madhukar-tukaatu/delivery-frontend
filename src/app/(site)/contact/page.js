import ContactForm from "./contact-form";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata = {
  title: "Contact Tukaatu Express",
};

export default function ContactPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-[#050d1a] px-6 py-24 text-white lg:px-8 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,197,24,0.10),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/20 bg-[#f5c518]/8 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#f5c518]">
            Contact
          </div>
          <h1 className="site-display mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">Let's talk delivery.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">Questions about a shipment, business delivery, franchise or coverage? Send us a message.</p>
        </div>
      </section>

      <section className="px-6 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[.75fr_1.25fr]">
          <div className="rounded-[2rem] bg-[#050d1a] border border-white/8 p-8 text-white sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5c518]">Get in touch</p>
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
  );
}

function Info({ Icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="rounded-xl bg-[#f5c518]/12 p-3 text-[#f5c518]"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-sm font-semibold text-slate-200">{text}</p>
      </div>
    </div>
  );
}
