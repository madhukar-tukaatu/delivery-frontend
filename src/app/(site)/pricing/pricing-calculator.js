"use client";
import "./pricing-calculator.css";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator, Check, Loader2, Package, ShieldCheck, Truck } from "lucide-react";
import { publicApi } from "../../../lib/public-api";

const fallback = {
  baseRate: 0,
  zoneCharge: 0,
  weightCharge: 0,
  serviceCharge: 0,
  codFee: 0,
  surcharge: 0,
  discount: 0,
  total: 0,
};

export default function PricingCalculator() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    weight: "1",
    service: "STANDARD",
    cod: "0",
  });
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCalculate = useMemo(
    () => form.origin.trim() && form.destination.trim() && Number(form.weight) > 0,
    [form]
  );

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function calculate(event) {
    event.preventDefault();
    if (!canCalculate) {
      setError("Please enter origin, destination and a valid weight.");
      return;
    }

    setLoading(true);
    setError("");
    setQuote(null);

    try {
      const response = await publicApi("/pricing/calculate", {
        method: "POST",
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          weight: Number(form.weight),
          service: form.service,
          codAmount: Number(form.cod || 0),
        }),
      });

      setQuote(response?.data || response);
    } catch (err) {
      setError(err.message || "Unable to calculate the delivery price.");
    } finally {
      setLoading(false);
    }
  }

  const values = quote || fallback;

  return (
    <section className="px-6 py-14 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[1.05fr_.95fr]">
        <form onSubmit={calculate} className="site-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-blue-600">Delivery quote</p>
              <h2 className="site-display text-2xl font-extrabold">Calculate your price</h2>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label="Pickup location">
              <input
                value={form.origin}
                onChange={(e) => update("origin", e.target.value)}
                placeholder="Kathmandu"
                className="input"
              />
            </Field>
            <Field label="Delivery location">
              <input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                placeholder="Pokhara"
                className="input"
              />
            </Field>
            <Field label="Parcel weight (kg)">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.weight}
                onChange={(e) => update("weight", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Service">
              <select
                value={form.service}
                onChange={(e) => update("service", e.target.value)}
                className="input"
              >
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="SAME_DAY">Same Day</option>
              </select>
            </Field>
            <Field label="COD amount (NPR)" className="sm:col-span-2">
              <input
                type="number"
                min="0"
                value={form.cod}
                onChange={(e) => update("cod", e.target.value)}
                placeholder="0"
                className="input"
              />
            </Field>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            disabled={loading}
            className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />}
            {loading ? "Calculating..." : "Calculate delivery price"}
          </button>
        </form>

        <div className="rounded-[2rem] bg-[#0b1220] p-6 text-white sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Estimated total</p>
              <p className="site-display mt-2 text-4xl font-extrabold">
                NPR {Number(values.total || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-cyan-300">
              <Package className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-bold">Price breakdown</p>
            <div className="mt-4 space-y-3">
              {[
                ["Base rate", values.baseRate],
                ["Zone charge", values.zoneCharge],
                ["Weight charge", values.weightCharge],
                ["Service charge", values.serviceCharge],
                ["COD fee", values.codFee],
                ["Surcharge", values.surcharge],
                ["Discount", -Math.abs(values.discount || 0)],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-5 text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold">NPR {Number(amount || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="my-3 border-t border-white/10" />
              <div className="flex justify-between text-base font-extrabold">
                <span>Total</span>
                <span>NPR {Number(values.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-300">
            {["No hidden pricing components", "Live backend pricing rules", "NPR currency throughout"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-7 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
            <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-400" />
            The displayed quote comes from the connected Tukaatu pricing API.
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
