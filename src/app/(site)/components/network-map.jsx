"use client";

import { useEffect, useState } from "react";
import { MapPin, Package, Truck } from "lucide-react";

const nodes = [
  {
    name: "Kathmandu",
    x: "18%",
    y: "34%",
  },
  {
    name: "Chitwan",
    x: "42%",
    y: "57%",
  },
  {
    name: "Pokhara",
    x: "48%",
    y: "27%",
  },
  {
    name: "Butwal",
    x: "66%",
    y: "61%",
  },
  {
    name: "Nepalgunj",
    x: "83%",
    y: "70%",
  },
];

export default function NetworkMap() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((value) => (value + 1) % nodes.length);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="overflow-hidden bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
              Nationwide network
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight text-[#0B1220] sm:text-5xl">
              One network connecting
              <span className="text-blue-600"> Nepal.</span>
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-500">
              Your parcel doesn't travel alone. It moves through a coordinated
              network of branches, hubs, riders and delivery routes.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NetworkStat label="Branches" value="50+" />
              <NetworkStat label="Districts" value="40+" />
              <NetworkStat label="Deliveries" value="24/7" />
            </div>
          </div>

          <div className="relative h-[480px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#0B1220] shadow-2xl">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:40px_40px]" />

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M18 34 C28 28, 38 42, 48 27"
                fill="none"
                stroke="rgba(37,99,235,.55)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />

              <path
                d="M48 27 C54 42, 58 50, 66 61"
                fill="none"
                stroke="rgba(6,182,212,.55)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />

              <path
                d="M66 61 C72 65, 77 68, 83 70"
                fill="none"
                stroke="rgba(37,99,235,.55)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />

              <path
                d="M42 57 C50 48, 55 55, 66 61"
                fill="none"
                stroke="rgba(255,255,255,.12)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            </svg>

            {nodes.map((node, index) => {
              const isActive = active === index;

              return (
                <div
                  key={node.name}
                  className="absolute transition-all duration-700"
                  style={{
                    left: node.x,
                    top: node.y,
                  }}
                >
                  <div
                    className={[
                      "relative flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-500",
                      isActive
                        ? "scale-125 border-blue-300 bg-blue-500 shadow-[0_0_35px_rgba(37,99,235,.8)]"
                        : "border-white/20 bg-white/10",
                    ].join(" ")}
                  >
                    <MapPin
                      className={[
                        "h-4 w-4",
                        isActive ? "text-white" : "text-slate-500",
                      ].join(" ")}
                    />

                    {isActive && (
                      <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />
                    )}
                  </div>

                  <div
                    className={[
                      "absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap text-xs font-bold transition-colors",
                      isActive ? "text-white" : "text-slate-600",
                    ].join(" ")}
                  >
                    {node.name}
                  </div>
                </div>
              );
            })}

            <div className="absolute bottom-6 left-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
                  <Truck className="h-5 w-5 text-white" />
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Network activity
                  </div>

                  <div className="mt-1 text-sm font-bold text-white">
                    Moving across Nepal
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-6 top-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <Package className="h-5 w-5 text-cyan-400" />

              <div className="mt-2 text-2xl font-black text-white">
                1,248
              </div>

              <div className="text-xs text-slate-500">
                shipments moving
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NetworkStat({ value, label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-2xl font-black text-[#0B1220]">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}