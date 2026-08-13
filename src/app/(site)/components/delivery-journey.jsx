"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Home,
  MapPin,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";

const stages = [
  {
    id: "pickup",
    number: "01",
    title: "Pickup",
    subtitle: "We collect your parcel",
    description:
      "Your shipment starts its journey from your home, store, or business.",
    icon: Package,
  },
  {
    id: "branch",
    number: "02",
    title: "Local Branch",
    subtitle: "Sorted near you",
    description:
      "The parcel reaches your nearest Tukaatu Express branch for processing.",
    icon: Warehouse,
  },
  {
    id: "transfer",
    number: "03",
    title: "Hub Transfer",
    subtitle: "Moving across Nepal",
    description:
      "Our logistics network transfers your shipment toward its destination.",
    icon: Truck,
  },
  {
    id: "destination",
    number: "04",
    title: "Destination Branch",
    subtitle: "Almost there",
    description:
      "The shipment reaches the branch closest to your recipient.",
    icon: MapPin,
  },
  {
    id: "delivery",
    number: "05",
    title: "Your Door",
    subtitle: "Delivered",
    description:
      "A Tukaatu delivery rider brings the parcel directly to your doorstep.",
    icon: Home,
  },
];

export default function DeliveryJourney() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((current) => (current + 1) % stages.length);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const current = stages[active];

  return (
    <section className="relative overflow-hidden bg-[#0B1220] py-28 text-white">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-blue-300 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            One network. Every destination.
          </div>

          <h2 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            From pickup
            <span className="text-blue-400"> to doorstep.</span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-400">
            Follow your parcel through the Tukaatu Express network as it moves
            from your location to its final destination.
          </p>
        </div>

        <div className="mt-20">
          {/* Route */}
          <div className="relative hidden lg:block">
            <div className="absolute left-[10%] right-[10%] top-10 h-px bg-white/10" />

            <div
              className="absolute left-[10%] top-10 h-px bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 transition-all duration-700"
              style={{
                width: `${(active / (stages.length - 1)) * 80}%`,
              }}
            />

            <div className="grid grid-cols-5 gap-5">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = index === active;
                const isCompleted = index < active;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setActive(index)}
                    className="group relative text-center"
                  >
                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                      <div
                        className={[
                          "absolute inset-0 rounded-full transition-all duration-500",
                          isActive
                            ? "scale-125 bg-blue-500/20"
                            : "bg-transparent",
                        ].join(" ")}
                      />

                      <div
                        className={[
                          "relative z-10 flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-500",
                          isActive
                            ? "border-blue-400 bg-blue-600 shadow-[0_0_50px_rgba(37,99,235,0.45)]"
                            : isCompleted
                              ? "border-cyan-400/60 bg-cyan-400/10"
                              : "border-white/10 bg-[#111a2b]",
                        ].join(" ")}
                      >
                        {isCompleted ? (
                          <Check className="h-7 w-7 text-cyan-300" />
                        ) : (
                          <Icon
                            className={[
                              "h-7 w-7",
                              isActive
                                ? "text-white"
                                : "text-slate-500 group-hover:text-white",
                            ].join(" ")}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-7">
                      <div className="text-xs font-bold tracking-[0.25em] text-slate-600">
                        {stage.number}
                      </div>

                      <div
                        className={[
                          "mt-2 text-lg font-bold transition-colors",
                          isActive ? "text-white" : "text-slate-500",
                        ].join(" ")}
                      >
                        {stage.title}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {stage.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile */}
          <div className="space-y-3 lg:hidden">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === active;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActive(index)}
                  className={[
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                    isActive
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-white/5 bg-white/[0.03]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 text-slate-500",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="font-bold">{stage.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {stage.subtitle}
                    </div>
                  </div>

                  <ArrowRight className="ml-auto h-4 w-4 text-slate-600" />
                </button>
              );
            })}
          </div>

          {/* Current shipment */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                      <Package className="h-6 w-6 text-blue-400" />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Shipment TKT-2026-849251
                      </div>

                      <div className="mt-1 text-lg font-bold">
                        Kathmandu → Pokhara
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-blue-400">
                        {current.title}
                      </span>

                      <span className="text-slate-500">
                        {active + 1} / {stages.length}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                        style={{
                          width: `${((active + 1) / stages.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="md:w-72">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                    <div className="text-sm font-semibold text-slate-400">
                      Current update
                    </div>

                    <div
                      key={current.id}
                      className="mt-3 animate-[fadeIn_.5s_ease-out]"
                    >
                      <div className="text-2xl font-black">
                        {current.title}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {current.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}