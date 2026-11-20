"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  Copy,
  ExternalLink,
  Info,
  MapPin,
  Navigation,
  Package,
  Phone,
  Radio,
  Search,
  Sparkles,
  Truck,
  User,
} from "lucide-react";
import { normalizeTracking, publicApi } from "../../../lib/public-api";
import { getEcho } from "@/lib/echo";

// Dynamically load Leaflet TrackingMap with SSR disabled
const TrackingMap = dynamic(() => import("../component/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-full items-center justify-center rounded-2xl bg-slate-900/5 text-sm font-semibold text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span>Loading live satellite corridor...</span>
      </div>
    </div>
  ),
});

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

// Built-in Demo 1: AFTER Rider Starts Delivery (Live GPS active on road)
const LIVE_DEMO_DATA = {
  trackingNumber: "TEX-LIVE-KTM-001",
  status: "OUT_FOR_DELIVERY",
  currentStatus: "OUT_FOR_DELIVERY",
  isOutForDelivery: true,
  isDelivered: false,
  origin: "Kathmandu Central Hub",
  destination: "Pulchowk, Lalitpur",
  estimatedDelivery: "Today within 15 mins",
  currentLocation: "En route to delivery address",
  rider: {
    name: "Ram Shrestha",
    phone: "+977-9801234567",
    vehicle: "Honda CB Shine (BA 2 PA 4912)",
  },
  liveLocation: {
    lat: 27.6740,
    lng: 85.3280,
    heading: 145,
    speed: 28.5,
    updated_at: new Date().toISOString(),
    is_live: true,
  },
  recipient: {
    name: "Sita Sharma",
    city: "Lalitpur",
    area: "Pulchowk",
    address: "Opposite Labim Mall, Pulchowk, Lalitpur",
    latitude: 27.6710,
    longitude: 85.3240,
  },
  originData: {
    name: "Kathmandu Central Hub",
    city: "Kathmandu",
    latitude: 27.7172,
    longitude: 85.3240,
  },
  destinationData: {
    name: "Pulchowk Delivery Station",
    city: "Lalitpur",
    latitude: 27.6710,
    longitude: 85.3240,
  },
  timeline: [
    {
      status: "order_created",
      title: "Order Placed",
      description: "Shipment confirmed with Merchant Store",
      location: "Kathmandu Central Hub",
      occurred_at: "Today, 10:30 AM",
    },
    {
      status: "picked_up",
      title: "Picked Up",
      description: "Package received at Express origin sorting facility",
      location: "Baneshwor Sorting Hub",
      occurred_at: "Today, 11:45 AM",
    },
    {
      status: "in_transit",
      title: "Transferred to Local Hub",
      description: "Handed over to Lalitpur delivery branch",
      location: "Lalitpur Branch",
      occurred_at: "Today, 01:15 PM",
    },
    {
      status: "out_for_delivery",
      title: "Out for Delivery",
      description: "Rider Ram Shrestha departed on delivery run to your doorstep",
      location: "Pulchowk Delivery Corridor",
      occurred_at: "Today, 02:05 PM",
    },
  ],
};

// Built-in Demo 2: BEFORE Rider Starts Delivery (In Transit corridor route overview)
const IN_TRANSIT_DEMO_DATA = {
  trackingNumber: "TEX-TRANSIT-KTM-002",
  status: "IN_TRANSIT",
  currentStatus: "IN_TRANSIT",
  isOutForDelivery: false,
  isDelivered: false,
  origin: "Kathmandu Central Hub",
  destination: "Pulchowk, Lalitpur",
  estimatedDelivery: "Expected Today by 05:00 PM",
  currentLocation: "Kathmandu Central Hub (Sorted for Transfer)",
  rider: null,
  liveLocation: null,
  recipient: {
    name: "Sita Sharma",
    city: "Lalitpur",
    area: "Pulchowk",
    address: "Opposite Labim Mall, Pulchowk, Lalitpur",
    latitude: 27.6710,
    longitude: 85.3240,
  },
  originData: {
    name: "Kathmandu Central Hub",
    city: "Kathmandu",
    latitude: 27.7172,
    longitude: 85.3240,
  },
  destinationData: {
    name: "Pulchowk Delivery Station",
    city: "Lalitpur",
    latitude: 27.6710,
    longitude: 85.3240,
  },
  timeline: [
    {
      status: "order_created",
      title: "Order Placed",
      description: "Shipment confirmed with Merchant Store",
      location: "Kathmandu Central Hub",
      occurred_at: "Today, 10:30 AM",
    },
    {
      status: "picked_up",
      title: "Picked Up",
      description: "Package received at Express origin sorting facility",
      location: "Baneshwor Sorting Hub",
      occurred_at: "Today, 11:45 AM",
    },
    {
      status: "in_transit",
      title: "In Transit to Destination Hub",
      description: "Moving through Kathmandu hub transfer network",
      location: "Kathmandu Central Hub",
      occurred_at: "Today, 01:15 PM",
    },
  ],
};

export default function TrackingClient({ initialTracking }) {
  const [tracking, setTracking] = useState(initialTracking || "");
  const [result, setResult] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialTracking));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const pollIntervalRef = useRef(null);
  const demoIntervalRef = useRef(null);

  // Copy tracking number to clipboard
  function copyTracking() {
    if (!result?.trackingNumber) return;
    navigator.clipboard?.writeText(result.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Load demo scenario 1: Rider started delivery
  function loadLiveDeliveryDemo() {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setError("");
    setLoading(false);
    setIsDemoMode(true);
    setTracking(LIVE_DEMO_DATA.trackingNumber);
    setResult(LIVE_DEMO_DATA);
    setLiveLocation(LIVE_DEMO_DATA.liveLocation);

    // Simulate real-time live GPS movement every 3.5 seconds along the route
    let step = 0;
    const demoWaypoints = [
      [27.7172, 85.3240, 160, 22], // 1. Departing Kathmandu Central Hub
      [27.6955, 85.3375, 145, 32], // 2. Moving along Baneshwor corridor
      [27.6792, 85.3494, 150, 28], // 3. Crossing Koteshwor Junction
      [27.6735, 85.3360, 142, 26], // 4. Ring Road Gwarko segment
      [27.6718, 85.3280, 135, 20], // 5. Entering Lalitpur Pulchowk Area
      [27.6710, 85.3240, 120, 8],  // 6. Arriving at Destination Doorstep
    ];

    demoIntervalRef.current = setInterval(() => {
      step = (step + 1) % demoWaypoints.length;
      const [lat, lng, heading, speed] = demoWaypoints[step];
      setLiveLocation({
        lat,
        lng,
        heading,
        speed,
        updated_at: new Date().toISOString(),
        is_live: true,
      });
    }, 3000);
  }

  // Load demo scenario 2: Before delivery starts (In Transit)
  function loadInTransitDemo() {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setError("");
    setLoading(false);
    setIsDemoMode(true);
    setTracking(IN_TRANSIT_DEMO_DATA.trackingNumber);
    setResult(IN_TRANSIT_DEMO_DATA);
    setLiveLocation(null);
  }

  async function lookup(value = tracking) {
    const number = value.trim();
    if (!number) {
      setError("Please enter a tracking number.");
      return;
    }

    if (number.toUpperCase() === "TEX-LIVE-KTM-001" || number.toUpperCase() === "DEMO-LIVE") {
      loadLiveDeliveryDemo();
      return;
    }

    if (number.toUpperCase() === "TEX-TRANSIT-KTM-002" || number.toUpperCase() === "DEMO-TRANSIT") {
      loadInTransitDemo();
      return;
    }

    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    setIsDemoMode(false);
    setLoading(true);
    setError("");

    try {
      const response = await publicApi(`/tracking/${encodeURIComponent(number)}`);
      const normalized = normalizeTracking(response);
      setResult(normalized);

      // Live location is only set if shipment is actively out for delivery
      if (normalized.isOutForDelivery && normalized.liveLocation) {
        setLiveLocation(normalized.liveLocation);
      } else {
        setLiveLocation(null);
      }
    } catch (err) {
      setResult(null);
      setLiveLocation(null);
      setError(err.message || "Shipment could not be found. Check your tracking number and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialTracking) {
      lookup(initialTracking);
    } else {
      loadLiveDeliveryDemo();
    }
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTracking]);

  // Real-time WebSocket + Polling synchronization (Only active after rider starts delivery)
  useEffect(() => {
    if (isDemoMode || !result?.trackingNumber || !result?.isOutForDelivery) return;

    const echo = getEcho();
    const channelName = `tracking.${result.trackingNumber}`;

    if (echo) {
      try {
        const channel = echo.channel(channelName);
        const handleLocationUpdate = (event) => {
          if (event && event.lat && event.lng) {
            setLiveLocation({
              lat: Number(event.lat),
              lng: Number(event.lng),
              heading: event.heading != null ? Number(event.heading) : null,
              speed: event.speed != null ? Number(event.speed) : null,
              updated_at: event.updated_at || new Date().toISOString(),
              is_live: true,
            });
          }
        };

        channel.listen("rider.location.updated", handleLocationUpdate);
        channel.listen(".rider.location.updated", handleLocationUpdate);
      } catch (err) {
        console.warn("[Tracking] WebSocket subscription failed, falling back to polling:", err);
      }
    }

    // Polling fallback every 5 seconds while out for delivery
    pollIntervalRef.current = setInterval(async () => {
      try {
        const liveData = await publicApi(`/tracking/${encodeURIComponent(result.trackingNumber)}/live`);
        const data = liveData?.data || liveData;
        if (data?.is_live && data?.live_location) {
          setLiveLocation(data.live_location);
        }
      } catch {
        // silent fallback
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (echo) {
        try {
          echo.leave(channelName);
        } catch {}
      }
    };
  }, [result?.trackingNumber, result?.isOutForDelivery, isDemoMode]);

  const currentIndex = useMemo(() => {
    if (!result) return -1;
    const s = String(result.currentStatus || result.status || "").toUpperCase();
    return statusSteps.indexOf(s);
  }, [result]);

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Search Header Bar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-100 sm:p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              lookup();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                aria-label="Tracking number"
                placeholder="Enter tracking number (e.g. TEX-...)"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
            <button
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#071722] px-8 text-sm font-bold text-white shadow-lg transition hover:bg-blue-600 hover:shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Track Parcel</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pill Bar */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-400">Quick tests:</span>
            <button
              type="button"
              onClick={loadLiveDeliveryDemo}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition ${
                isDemoMode && result?.isOutForDelivery
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <Radio className="h-3 w-3 animate-pulse" />
              1. Delivery Started (Live Rider Active)
            </button>
            <button
              type="button"
              onClick={loadInTransitDemo}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition ${
                isDemoMode && !result?.isOutForDelivery
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <Package className="h-3 w-3" />
              2. Before Delivery (In Transit Hubs)
            </button>
            <button
              type="button"
              onClick={() => {
                setTracking("TEX-20261010-063516");
                lookup("TEX-20261010-063516");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Real: TEX-20261010-063516
            </button>
            <button
              type="button"
              onClick={() => {
                setTracking("TEX-20261010-545039");
                lookup("TEX-20261010-545039");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              Real: TEX-20261010-545039
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Shipment Not Found</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            {/* Top Shipment Status Header */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracking Reference</span>
                    {isDemoMode && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                        {result.isOutForDelivery ? "Demo: Out for Delivery" : "Demo: In Transit Hubs"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
                      {result.trackingNumber}
                    </h2>
                    <button
                      type="button"
                      onClick={copyTracking}
                      title="Copy Tracking Number"
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-sm border ${
                      result.isOutForDelivery
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : result.isDelivered
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      {result.isOutForDelivery && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                          result.isOutForDelivery
                            ? "bg-emerald-500"
                            : result.isDelivered
                            ? "bg-blue-500"
                            : "bg-slate-400"
                        }`}
                      />
                    </span>
                    <span>{prettyStatus(result.currentStatus || result.status)}</span>
                  </div>
                </div>
              </div>

              {/* 4 Summary Metric Tiles */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <MetricTile
                  icon={<MapPin className="h-4 w-4 text-blue-600" />}
                  label="Origin Hub"
                  value={result.origin}
                />
                <MetricTile
                  icon={<Navigation className="h-4 w-4 text-indigo-600" />}
                  label="Destination"
                  value={result.destination}
                />
                <MetricTile
                  icon={<Clock3 className="h-4 w-4 text-amber-600" />}
                  label="Estimated Time"
                  value={result.estimatedDelivery}
                />
                <MetricTile
                  icon={<Truck className="h-4 w-4 text-emerald-600" />}
                  label="Current Status"
                  value={prettyStatus(result.currentStatus || result.status)}
                />
              </div>
            </div>

            {/* Live Active Rider Card - Only shown AFTER rider starts delivery */}
            {result.isOutForDelivery && result.rider ? (
              <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-900 via-[#071722] to-slate-900 p-6 text-white shadow-xl">
                <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white shadow-inner">
                      <User className="h-7 w-7 text-blue-400" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight">{result.rider.name || "Assigned Rider"}</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                          <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                          Delivery Started • On the Road
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {result.rider.vehicle || "Verified Tukaatu Express Courier Rider"}
                      </p>
                      {liveLocation?.speed != null && (
                        <p className="mt-1 text-xs text-blue-300 font-semibold">
                          Current Speed: ~{Math.round(liveLocation.speed)} km/h • Heading: {Math.round(liveLocation.heading || 0)}°
                        </p>
                      )}
                    </div>
                  </div>

                  {result.rider.phone && (
                    <div className="flex items-center gap-3">
                      <a
                        href={`tel:${result.rider.phone}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500"
                      >
                        <Phone className="h-4 w-4" />
                        Call Rider
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Interactive Route Map Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${result.isOutForDelivery ? "bg-emerald-500 animate-ping" : "bg-blue-600"}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {result.isOutForDelivery ? "Real-Time GPS Map" : "Transit Corridor Route Map"}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-900">
                    Route: {result.origin} → {result.destination}
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  {result.isOutForDelivery ? (
                    <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      Live Geolocation Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 text-slate-600 px-3 py-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      Awaiting Last-Mile Delivery Departure
                    </span>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="mt-6 h-[440px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <TrackingMap
                  liveLocation={liveLocation}
                  origin={result.originData}
                  destination={result.destinationData}
                  fromCity={result.origin}
                  toCity={result.destination}
                  isOutForDelivery={result.isOutForDelivery}
                  isDelivered={result.isDelivered}
                />
              </div>

              {/* Notice when rider has not started delivery yet */}
              {!result.isOutForDelivery && !result.isDelivered && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-blue-50/80 p-4 text-xs font-medium text-blue-900 border border-blue-200/60">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Live GPS Map Activation: </span>
                    Real-time rider coordinates and live moving motorcycle will activate on this map automatically as soon as the rider departs the hub on their delivery run.
                  </div>
                </div>
              )}

              {/* Destination Address Note */}
              {result.recipient?.address && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 border border-slate-200/60">
                  <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Delivery Address: </span>
                    {result.recipient.address}
                    {result.recipient.name && ` (Recipient: ${result.recipient.name})`}
                  </div>
                </div>
              )}
            </div>

            {/* Step-by-Step Progress & Detailed Timeline */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Milestone Progression</span>
                <h3 className="mt-1 text-xl font-black text-slate-900">Delivery Journey</h3>
              </div>

              {/* Graphical Step Timeline */}
              <div className="mt-8">
                <StepTimeline currentIndex={currentIndex} status={result.status} />
              </div>

              {/* Detailed Event Log */}
              <div className="mt-10 border-t border-slate-100 pt-8">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Detailed Activity History</h4>
                {result.timeline?.length ? (
                  <Timeline events={result.timeline} />
                ) : (
                  <p className="text-sm text-slate-400">No milestone events logged yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricTile({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-slate-50">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-black text-slate-900">{value || "—"}</p>
    </div>
  );
}

function StepTimeline({ currentIndex, status }) {
  return (
    <div className="grid gap-0 md:grid-cols-8">
      {statusSteps.map((step, index) => {
        const done = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step} className="relative flex gap-4 md:block">
            <div className="flex flex-col items-center md:block">
              <div
                className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition-all ${
                  isCurrent
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                    : done
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                    : "bg-slate-100 text-slate-400 border-slate-200"
                }`}
              >
                {isCurrent ? (
                  <Truck className="h-5 w-5 animate-bounce" />
                ) : done ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
              </div>
              {index < statusSteps.length - 1 && (
                <div
                  className={`absolute left-5 top-11 h-[calc(100%-10px)] w-0.5 md:left-5 md:top-5 md:h-0.5 md:w-[calc(100%-20px)] ${
                    index < currentIndex ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
            <div className="pb-7 md:mt-4 md:pr-4">
              <p
                className={`text-xs font-black ${
                  isCurrent ? "text-blue-600" : done ? "text-slate-900" : "text-slate-400"
                }`}
              >
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
    <div className="relative space-y-6">
      {events.map((event, index) => {
        const status = event.newStatus || event.new_status || event.status;
        const location =
          event.location?.name || event.location || event.city || "";
        const date = event.createdAt || event.created_at || event.occurred_at || event.date;

        return (
          <div key={`${status}-${date}-${index}`} className="relative flex gap-4">
            {index < events.length - 1 && (
              <div className="absolute left-5 top-10 h-[calc(100%-4px)] w-0.5 bg-slate-200" />
            )}
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-4 ring-white border border-blue-100 shadow-sm">
              {index === 0 ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            </div>
            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="font-black text-slate-900">{event.title || prettyStatus(status)}</p>
                {date && (
                  <span className="text-xs font-semibold text-slate-400">
                    {typeof date === "string" && date.includes("T") ? new Date(date).toLocaleString() : date}
                  </span>
                )}
              </div>
              {location && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{location}</span>
                </div>
              )}
              {(event.note || event.description) && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
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
