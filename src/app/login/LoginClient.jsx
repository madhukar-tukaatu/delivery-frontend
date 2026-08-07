"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import styles from "./login.module.css";

function unwrapResponse(response) {
  const body = response?.data ?? {};
  return { data: body?.data ?? body, message: body?.message ?? null };
}

function getApiErrorMessage(error) {
  const errors = error?.response?.data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Login failed. Check your credentials and try again."
  );
}

function normalizeRole(role) {
  if (!role) return "";
  if (typeof role === "string") return role.toLowerCase().trim();
  return String(role?.name || role?.slug || role?.code || "").toLowerCase().trim();
}

function getRoleRedirect(user) {
  const role = normalizeRole(user?.role) ||
    (Array.isArray(user?.roles) ? user.roles.map(normalizeRole).find(Boolean) : "") || "";

  if (["merchant", "merchant_owner", "merchant_admin", "merchant_staff"].includes(role))
    return "/merchant/dashboard";
  if (["booking_staff", "pickup_staff", "dispatch_staff", "delivery_staff", "warehouse_staff", "branch_staff"].includes(role))
    return "/staff/dashboard";
  if (role === "rider") return "/rider/dashboard";
  return "/admin/dashboard";
}

function getSafeRedirect(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestedRedirect = getSafeRedirect(searchParams.get("redirect"));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      const result = unwrapResponse(response);
      const token = result?.data?.token;
      const user = result?.data?.user;

      if (!token || !user) throw new Error("Invalid login response.");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (Array.isArray(user?.permissions))
        localStorage.setItem("permissions", JSON.stringify(user.permissions));
      else localStorage.removeItem("permissions");
      if (Array.isArray(user?.menus))
        localStorage.setItem("menus", JSON.stringify(user.menus));
      else localStorage.removeItem("menus");

      router.replace(requestedRedirect || getRoleRedirect(user));
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <div className={styles.ambientThree} aria-hidden="true" />

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <img
            src="/images/logo.png"
            alt="Tukaatu Express"
            style={{ height: 52, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Status */}
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          All systems operational
        </div>

        {/* Header */}
        <span className={styles.eyebrow}>Secure Portal</span>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to continue to your operations workspace.</p>

        {/* Error */}
        {error && (
          <div className={styles.error}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="login-email">Email, username or phone</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
                </svg>
              </span>
              <input
                id="login-email"
                className={styles.input}
                type="text"
                placeholder="Enter login ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="login-password"
                className={styles.input}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <><span className={styles.spinner} /> Signing in…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign in securely
              </>
            )}
          </button>
        </form>

        <hr className={styles.divider} />
        <p className={styles.helpText}>
          Franchise managers must complete the password setup sent to their registered email before signing in.
        </p>
      </div>

      <p className={styles.footer}>© {new Date().getFullYear()} Tukaatu Express · Authorized access only</p>
    </main>
  );
}
