"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { routeForRole, saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* ─── Left sidebar ─── */
        .login-sidebar {
          width: 200px;
          min-width: 200px;
          background: linear-gradient(180deg, #0a1628 0%, #0f1f3d 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0;
          position: relative;
        }

        .sidebar-logo {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          overflow: hidden;
          background: #f5c518;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(245, 197, 24, 0.3);
        }

        .sidebar-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebar-brand {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          color: rgba(255, 255, 255, 0.85);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 6px;
          text-transform: uppercase;
          margin-top: auto;
          margin-bottom: auto;
          user-select: none;
        }

        .sidebar-accent {
          width: 36px;
          height: 3px;
          background: #f5c518;
          border-radius: 2px;
          margin-bottom: 24px;
        }

        /* ─── Main area ─── */
        .login-main {
          flex: 1;
          background: linear-gradient(160deg, #0a1628 0%, #0d2a5c 35%, #1a5fb4 70%, #2980d9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .login-main::before {
          content: '';
          position: absolute;
          top: -30%;
          right: -20%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(26, 95, 180, 0.4) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-main::after {
          content: '';
          position: absolute;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(41, 128, 217, 0.3) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ─── Glass card ─── */
        .login-card {
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 48px 44px;
          position: relative;
          z-index: 1;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .card-title {
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }

        .card-subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 36px 0;
        }

        /* ─── Form ─── */
        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          color: #ffffff;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: rgba(255, 255, 255, 0.45);
          pointer-events: none;
          transition: color 0.3s ease;
        }

        .input-wrapper:focus-within .input-icon {
          color: rgba(245, 197, 24, 0.8);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .form-input:focus {
          border-color: rgba(245, 197, 24, 0.6);
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.15);
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #f5c518 0%, #e6b800 100%);
          color: #0a1628;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          letter-spacing: 0.3px;
          box-shadow: 0 4px 16px rgba(245, 197, 24, 0.3);
        }

        .login-btn:hover {
          background: linear-gradient(135deg, #ffd036 0%, #f5c518 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(245, 197, 24, 0.4);
        }

        .login-btn:active {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-btn-loading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(10, 22, 40, 0.3);
          border-top-color: #0a1628;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-alert {
          background: rgba(220, 38, 38, 0.15);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        /* ─── Breadcrumb ─── */
        .login-breadcrumb {
          position: absolute;
          top: 28px;
          left: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          z-index: 2;
        }



        .breadcrumb-sep {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          user-select: none;
        }

        .breadcrumb-current {
          color: #ffffff;
          font-weight: 600;
        }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
          .login-sidebar {
            display: none;
          }

          .login-main {
            padding: 24px;
          }

          .login-breadcrumb {
            top: 20px;
            left: 24px;
          }

          .login-card {
            padding: 36px 28px;
          }

          .card-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="login-wrapper">
        {/* Left Sidebar */}
        <aside className="login-sidebar">
          <div className="sidebar-logo">
            <Image
              src="/images/favicon.png"
              alt="Tukaatu"
              width={52}
              height={52}
            />
          </div>

          <span className="sidebar-brand">Tukaatu Express</span>

          <div className="sidebar-accent" />
        </aside>

        {/* Main Content */}
        <main className="login-main">
          <nav className="login-breadcrumb">
            <Link href="/" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Login</span>
          </nav>
          <div className="login-card">
            <h1 className="card-title">Courier Delivery Gateway</h1>
            <p className="card-subtitle">Sign in to your account.</p>

            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13L2 4" />
                  </svg>
                  <input
                    id="login-email"
                    className="form-input"
                    type="email"
                    placeholder="Enter Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="login-password"
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                className="login-btn"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="login-btn-loading">
                    <span className="spinner" />
                    Signing in…
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
