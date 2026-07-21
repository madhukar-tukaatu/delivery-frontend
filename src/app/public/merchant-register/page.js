"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signupMerchant } from "@/services/merchantSignupService";
import s from "./register.module.css";

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showPw, setShowPw]           = useState(false);
  const [showCpw, setShowCpw]         = useState(false);
  const [v, setV] = useState({
    business_name: "", owner_name: "", contact_person: "",
    email: "", phone: "", password: "", password_confirmation: "",
  });

  const set = (f) => (e) => setV((p) => ({ ...p, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (v.password.length < 6)                        return setError("Password must be at least 6 characters.");
    if (v.password !== v.password_confirmation)       return setError("Passwords do not match.");
    try {
      setLoading(true);
      await signupMerchant(v);
      router.push("/login");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>

        {/* Logo */}
        <div className={s.logoRow}>
          <Image src="/images/logo.png" alt="Tukaatu Express" width={40} height={40} className={s.logo} />
          <div>
            <div className={s.appName}>Tukaatu Express</div>
            <div className={s.appSub}>Merchant Registration</div>
          </div>
        </div>

        <h1 className={s.title}>Create your merchant account</h1>
        <p className={s.subtitle}>
          Register below to get started. After login you'll complete your business profile and upload KYC documents before going live.
        </p>

        {error && (
          <div className={s.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Business ── */}
          <p className={s.groupLabel}>Business details</p>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>Business name <span className={s.ast}>*</span></label>
              <input className={s.input} placeholder="e.g. ABC Fashion Store" required
                value={v.business_name} onChange={set("business_name")} />
            </div>
            <div className={s.field}>
              <label className={s.label}>Owner name <span className={s.ast}>*</span></label>
              <input className={s.input} placeholder="Full legal name" required
                value={v.owner_name} onChange={set("owner_name")} />
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Contact person <span className={s.opt}>(optional)</span></label>
            <input className={s.input} placeholder="Person who handles shipments day-to-day"
              value={v.contact_person} onChange={set("contact_person")} />
          </div>

          {/* ── Contact ── */}
          <p className={s.groupLabel} style={{ marginTop: 22 }}>Contact & login</p>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>Email address <span className={s.ast}>*</span></label>
              <input className={s.input} type="email" placeholder="you@business.com" required
                value={v.email} onChange={set("email")} />
            </div>
            <div className={s.field}>
              <label className={s.label}>Phone number <span className={s.ast}>*</span></label>
              <input className={s.input} placeholder="98XXXXXXXX" required
                value={v.phone} onChange={set("phone")} />
            </div>
          </div>

          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label}>Password <span className={s.ast}>*</span></label>
              <div className={s.pwWrap}>
                <input className={s.input} type={showPw ? "text" : "password"}
                  placeholder="Min. 6 characters" required style={{ paddingRight: 38 }}
                  value={v.password} onChange={set("password")} />
                <button type="button" className={s.eye} tabIndex={-1} onClick={() => setShowPw(x => !x)}>
                  {showPw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Confirm password <span className={s.ast}>*</span></label>
              <div className={s.pwWrap}>
                <input className={s.input} type={showCpw ? "text" : "password"}
                  placeholder="Re-enter password" required style={{ paddingRight: 38 }}
                  value={v.password_confirmation} onChange={set("password_confirmation")} />
                <button type="button" className={s.eye} tabIndex={-1} onClick={() => setShowCpw(x => !x)}>
                  {showCpw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className={s.note}>
            After creating your account you'll be guided to upload: business registration certificate, PAN/VAT document, owner ID, and bank proof — before your account is activated by our team.
          </div>

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? <><span className={s.spinner} />Creating account…</> : "Create account"}
          </button>

        </form>

        <p className={s.loginLine}>
          Already registered?{" "}
          <button type="button" className={s.loginLink} onClick={() => router.push("/login")}>
            Sign in to your account
          </button>
        </p>

        <p className={s.footer}>© {new Date().getFullYear()} Tukaatu Express. All rights reserved.</p>
      </div>
    </div>
  );
}

function EyeOn() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
