"use client";
import "./apply.css";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { publicApi } from "../../../../lib/public-api";

const initial = {
  name: "",
  email: "",
  phone: "",
  province: "",
  district: "",
  municipality: "",
  experience: "",
  message: "",
};

export default function FranchiseForm() {
  const [form, setForm] = useState(initial);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setState("loading");
    setError("");

    try {
      await publicApi("/franchise/apply", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setState("success");
      setForm(initial);
    } catch (err) {
      setError(err.message || "Unable to submit the application.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="site-card mt-10 rounded-[2rem] p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="site-display mt-6 text-3xl font-extrabold">Application submitted.</h2>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
          Thank you. Our franchise team will review your application and contact you through the details you provided.
        </p>
        <button onClick={() => setState("idle")} className="mt-7 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="site-card mt-10 rounded-[2rem] p-6 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="form-input" />
        </Field>
        <Field label="Email" required>
          <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="form-input" />
        </Field>
        <Field label="Phone" required>
          <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="form-input" />
        </Field>
        <Field label="Province" required>
          <input required value={form.province} onChange={(e) => update("province", e.target.value)} placeholder="Bagmati" className="form-input" />
        </Field>
        <Field label="District" required>
          <input required value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="Kathmandu" className="form-input" />
        </Field>
        <Field label="Municipality / city" required>
          <input required value={form.municipality} onChange={(e) => update("municipality", e.target.value)} className="form-input" />
        </Field>
        <Field label="Relevant business experience" className="sm:col-span-2">
          <textarea rows={4} value={form.experience} onChange={(e) => update("experience", e.target.value)} className="form-input py-3" />
        </Field>
        <Field label="Additional information" className="sm:col-span-2">
          <textarea rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} className="form-input py-3" />
        </Field>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="mt-7 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">By submitting, you agree that Tukaatu may contact you regarding the franchise application.</p>
        <button disabled={state === "loading"} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit application
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}
