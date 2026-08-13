import Link from "next/link";
import { ArrowRight, MapPin, Package, Play, Route, ShieldCheck, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#f8fafc] px-6 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
      <div className="absolute inset-0 site-grid opacity-60" />
      <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Nepal-wide delivery network
          </div>

          <h1 className="site-display mt-7 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-[#0b1220] sm:text-6xl lg:text-7xl">
            Deliver across Nepal.
            <span className="block text-blue-600">Faster. Smarter.</span>
            <span className="block">Simpler.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            A modern delivery network for individuals and growing businesses —
            from pickup to doorstep, with visibility at every step.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/site/track"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700"
            >
              Track your parcel <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/site/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              Calculate price
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            {[
              ["Nationwide coverage", Route],
              ["Live tracking", Zap],
              ["Secure delivery", ShieldCheck],
            ].map(([text, Icon]) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-blue-600" />
                {text}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[580px]">
          <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-cyan-200/50 blur-3xl" />
          <div className="absolute -right-8 bottom-10 h-40 w-40 rounded-full bg-blue-200/70 blur-3xl" />

          <div className="site-glow relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 sm:p-5">
            <div className="relative h-[470px] overflow-hidden rounded-[1.5rem] bg-[#eef5fb]">
              <div className="absolute inset-0 opacity-40 site-grid" />
              <div className="absolute left-[17%] top-[24%] h-3 w-3 rounded-full bg-blue-600 ring-8 ring-blue-600/10" />
              <div className="absolute left-[45%] top-[48%] h-3 w-3 rounded-full bg-cyan-500 ring-8 ring-cyan-500/10" />
              <div className="absolute right-[19%] top-[32%] h-3 w-3 rounded-full bg-blue-600 ring-8 ring-blue-600/10" />
              <div className="absolute right-[25%] bottom-[20%] h-3 w-3 rounded-full bg-emerald-500 ring-8 ring-emerald-500/10" />

              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 580 470" fill="none">
                <path d="M100 115 C190 150 225 220 300 230 S400 210 470 150" stroke="#2563EB" strokeWidth="3" strokeDasharray="8 9" />
                <path d="M300 230 C330 280 410 300 440 365" stroke="#06B6D4" strokeWidth="3" strokeDasharray="8 9" />
              </svg>

              <div className="site-float absolute left-5 top-5 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Live shipment</p>
                    <p className="text-sm font-extrabold">TKT-2026-849251</p>
                  </div>
                </div>
              </div>

              <div className="absolute right-5 top-5 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  In transit
                </p>
              </div>

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/95 p-5 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Estimated arrival</p>
                    <p className="site-display mt-1 text-xl font-extrabold">Tomorrow</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3 text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[72%] rounded-full bg-blue-600" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>Kathmandu</span>
                  <span>Pokhara</span>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/site/track"
            className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-xl hover:bg-slate-50"
          >
            <Play className="h-4 w-4 fill-current text-blue-600" />
            See how tracking works
          </Link>
        </div>
      </div>
    </section>
  );
}
