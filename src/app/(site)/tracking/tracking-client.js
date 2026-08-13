"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Search,
  Truck,
} from "lucide-react";
import { normalizeTracking, publicApi } from "../../../lib/public-api";

const statusSteps = [
  "CREATED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "ORIGIN_HUB",
  "IN_TRANSIT",
  "DESTINATION_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function prettyStatus(status) {
  return String(status || "UNKNOWN")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TrackingClient({ initialTracking }) {
  const [tracking, setTracking] = useState(initialTracking || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialTracking));
  const [error, setError] = useState("");

  async function lookup(value = tracking) {
    const number = value.trim();
    if (!number) {
      setError("Enter a tracking number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await publicApi(
        `/tracking/${encodeURIComponent(number)}`
      );
      setResult(normalizeTracking(response));
    } catch (err) {
      setResult(null);
      setError(err.message || "Shipment could not be found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialTracking) lookup(initialTracking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTracking]);

  const currentIndex = useMemo(() => {
    if (!result) return -1;
    return statusSteps.indexOf(result.status);
  }, [result]);

  return (
    <section className="px-6 py-14 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            lookup();
          }}
          className="site-card rounded-3xl p-3 sm:p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                placeholder="TKT-2026-849251"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <button
              disabled={loading}
              className="h-14 rounded-2xl bg-blue-600 px-7 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Track parcel"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Tracking unavailable</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8">
            <div className="grid gap-4 md:grid-cols-4">
              <Summary label="Tracking number" value={result.trackingNumber} />
              <Summary label="Current status" value={prettyStatus(result.status)} />
              <Summary label="Current location" value={result.currentLocation} />
              <Summary label="Estimated delivery" value={result.estimatedDelivery} />
            </div>

            <div className="site-card mt-5 rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Shipment route
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-extrabold">
                    <span>{result.origin}</span>
                    <span className="text-slate-300">→</span>
                    <span>{result.destination}</span>
                  </div>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {prettyStatus(result.status)}
                </div>
              </div>

              <div className="mt-9">
                {result.timeline?.length ? (
                  <Timeline events={result.timeline} />
                ) : (
                  <StepTimeline currentIndex={currentIndex} status={result.status} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 truncate text-sm font-extrabold text-slate-950">{value || "—"}</p>
    </div>
  );
}

function StepTimeline({ currentIndex, status }) {
  return (
    <div className="grid gap-0 md:grid-cols-8">
      {statusSteps.map((step, index) => {
        const done = index <= currentIndex;
        return (
          <div key={step} className="relative flex gap-4 md:block">
            <div className="flex flex-col items-center md:block">
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white ${
                  done ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {index === currentIndex ? (
                  <Truck className="h-4 w-4" />
                ) : done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
              </div>
              {index < statusSteps.length - 1 && (
                <div
                  className={`absolute left-5 top-10 h-[calc(100%-10px)] w-px md:left-5 md:top-5 md:h-px md:w-[calc(100%-20px)] ${
                    index < currentIndex ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
            <div className="pb-7 md:mt-4 md:pr-4">
              <p className={`text-xs font-bold ${done ? "text-slate-900" : "text-slate-400"}`}>
                {prettyStatus(step)}
              </p>
            </div>
          </div>
        );
      })}
      <p className="sr-only">Current status: {prettyStatus(status)}</p>
    </div>
  );
}

function Timeline({ events }) {
  return (
    <div className="relative">
      {events.map((event, index) => {
        const status = event.newStatus || event.new_status || event.status;
        const location =
          event.location?.name || event.location || event.city || "";
        const date = event.createdAt || event.created_at || event.date;

        return (
          <div key={`${status}-${date}-${index}`} className="relative flex gap-4 pb-8 last:pb-0">
            {index < events.length - 1 && (
              <div className="absolute left-5 top-10 h-[calc(100%-8px)] w-px bg-slate-200" />
            )}
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-8 ring-white">
              {index === 0 ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            </div>
            <div className="pt-1">
              <p className="font-bold text-slate-950">{prettyStatus(status)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
                )}
                {date && <span>{new Date(date).toLocaleString()}</span>}
              </div>
              {(event.note || event.description) && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {event.note || event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
