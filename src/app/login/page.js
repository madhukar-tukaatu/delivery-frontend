"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import { routeForRole, saveAuth } from "@/lib/auth";
import s from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data.data;
      saveAuth(token, user);
      router.push(routeForRole(user.role, user));
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>

        {/* Logo */}
        <div className={s.logoWrap}>
          <Image
            src="/images/logo.png"
            alt="Tukaatu Express"
            width={96}
            height={96}
            className={s.logoImg}
          />
        </div>

        <h1 className={s.title}>Welcome back</h1>
        <p className={s.subtitle}>Sign in to your account to continue.</p>

        {error && (
          <div className={s.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={s.field}>
            <label className={s.label} htmlFor="login-email">Email / Phone</label>
            <input
              id="login-email"
              className={s.input}
              type="text"
              placeholder="Email/Phone"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="login-password">Password</label>
            <div className={s.inputWrap}>
              <input
                id="login-password"
                className={`${s.input} ${s.inputPr}`}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={s.togglePw}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? <><span className={s.spinner} /> Signing in…</> : "Sign in"}
          </button>
        </form>

        <div className={s.footer}>
          © {new Date().getFullYear()} Tukaatu Express
        </div>

      </div>
    </div>
  );
}
