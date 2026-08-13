"use client";
import "./contact.css";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { publicApi } from "../../../lib/public-api";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
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
      await publicApi("/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setState("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setError(err.message || "Unable to send your message.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="site-card flex min-h-[460px] flex-col items-center justify-center rounded-[2rem] p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="site-display mt-6 text-3xl font-extrabold">Message sent.</h2>
        <p className="mt-3 max-w-md leading-7 text-slate-600">Thanks for reaching out. Our team will get back to you using the contact details provided.</p>
        <button onClick={() => setState("idle")} className="mt-7 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="site-card rounded-[2rem] p-6 sm:p-9">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required><input required value={form.name} onChange={(e) => update("name", e.target.value)} className="contact-input" /></Field>
        <Field label="Email" required><input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="contact-input" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="contact-input" /></Field>
        <Field label="Subject" required><input required value={form.subject} onChange={(e) => update("subject", e.target.value)} className="contact-input" /></Field>
        <Field label="Message" required className="sm:col-span-2"><textarea required rows={7} value={form.message} onChange={(e) => update("message", e.target.value)} className="contact-input py-3" /></Field>
      </div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      <button disabled={state === "loading"} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send message
      </button>
    </form>
  );
}

function Field({ label, required, children, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-bold text-slate-700">{label}{required ? " *" : ""}</span>{children}</label>;
}
