"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Search,
} from "lucide-react";

export default function TrackingPreview() {
  const [trackingNumber, setTrackingNumber] = useState("");

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              <Search className="h-4 w-4" />
              Track in real time
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight text-[#0B1220] sm:text-5xl">
              Know where your parcel is.
              <span className="text-blue-600"> Every step.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
              From the moment we collect your shipment until it reaches your
              customer, Tukaatu keeps every movement visible.
            </p>

            <form className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <button
                type="button"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0B1220] px-7 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-600"
              >
                Track
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-400">
              Example: TKT-2026-849251
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Tracking
                  </div>

                  <div className="mt-1 text-xl font-black text-[#0B1220]">
                    TKT-2026-849251
                  </div>
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                  In Transit
                </div>
              </div>

              <div className="mt-8 space-y-0">
                <TrackingItem
                  active
                  title="Shipment picked up"
                  location="Kathmandu"
                  time="10:24 AM"
                />

                <TrackingItem
                  active
                  title="Arrived at origin branch"
                  location="Kathmandu Central Branch"
                  time="12:08 PM"
                />

                <TrackingItem
                  active
                  title="Departed for destination"
                  location="Kathmandu → Pokhara"
                  time="03:42 PM"
                />

                <TrackingItem
                  title="Destination branch"
                  location="Pokhara"
                />

                <TrackingItem
                  title="Out for delivery"
                  location="Recipient address"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackingItem({
  active = false,
  title,
  location,
  time,
}) {
  return (
    <div className="relative flex gap-5 pb-8 last:pb-0">
      <div className="relative z-10">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-full border-4 border-white",
            active
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          {active ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Clock3 className="h-5 w-5" />
          )}
        </div>

        <div className="absolute left-1/2 top-10 h-full w-px -translate-x-1/2 bg-slate-200" />
      </div>

      <div className="flex-1 pt-1">
        <div className="flex flex-col justify-between gap-1 sm:flex-row">
          <div className="font-bold text-[#0B1220]">{title}</div>

          {time && (
            <div className="text-xs font-semibold text-slate-400">
              {time}
            </div>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
          {location}
        </div>
      </div>
    </div>
  );
}