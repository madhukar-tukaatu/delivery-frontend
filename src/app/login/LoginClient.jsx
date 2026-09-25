"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../auth-pages.css";
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Typography,
  message,
  Spin,
} from "antd";
import {
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";

import api from "@/lib/api";
import { Image } from "antd";

const { Title, Text, Paragraph } = Typography;

/*
 * Extract the main API payload while supporting:
 *
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     token: "...",
 *     user: {}
 *   }
 * }
 *
 * and:
 *
 * {
 *   token: "...",
 *   user: {}
 * }
 */
function unwrapResponse(response) {
  const body = response?.data ?? {};

  return {
    data: body?.data ?? body,
    message: body?.message ?? null,
  };
}

function getApiErrorMessage(error) {
  const errors = error?.response?.data?.errors;

  if (errors && typeof errors === "object") {
    const firstError = Object.values(errors).flat().find(Boolean);

    if (firstError) {
      return String(firstError);
    }
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "Login failed. Check your credentials and try again."
  );
}

function normalizeRoleName(role) {
  if (!role) {
    return "";
  }

  if (typeof role === "string") {
    return role.toLowerCase().trim();
  }

  return String(role?.name || role?.slug || role?.code || "")
    .toLowerCase()
    .trim();
}

function getPrimaryRole(user) {
  const directRole = normalizeRoleName(user?.role);

  if (directRole) {
    return directRole;
  }

  if (Array.isArray(user?.roles)) {
    return user.roles.map(normalizeRoleName).find(Boolean) || "";
  }

  return "";
}

/*
 * Check if user is already logged in
 */
function isUserLoggedIn() {
  if (typeof window === "undefined") return false;
  
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  
  return !!(token && user);
}

/*
 * Get stored user data
 */
function getStoredUser() {
  if (typeof window === "undefined") return null;
  
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/*
 * Branch managers use the existing admin portal.
 * Merchants and operational staff use their own portals.
 */
function getRoleRedirect(user) {
  const role = getPrimaryRole(user);

  // Roles that use the STAFF portal (/staff/*)
  // booking_staff uses the ADMIN portal (they book shipments via admin UI)
   const staffPortalRoles = new Set([
    "pickup_staff",
    "delivery_staff",
    "dispatch_staff",
    "warehouse_staff",
    "rider",
  ]);


  const merchantRoles = new Set([
    "merchant",
    "merchant_owner",
    "merchant_admin",
    "merchant_staff",
  ]);

  // Admin portal roles (super_admin, branch_manager, sub_branch_manager,
  // main_admin, pricing_manager, booking_staff)
  if (merchantRoles.has(role)) {
    return "/merchant/dashboard";
  }

  if (staffPortalRoles.has(role)) {
    return "/staff/dashboard";
  }

  return "/admin/dashboard";
}

/*
 * Prevent external redirect values such as:
 * https://malicious-site.example
 * //malicious-site.example
 */
function getSafeRedirect(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }

  return value;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const accountSetupSuccess = searchParams.get("account_setup") === "success";

  const registeredEmail = searchParams.get("email") || "";

  const requestedRedirect = getSafeRedirect(searchParams.get("redirect"));

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isUserLoggedIn()) {
          const user = getStoredUser();
          if (user) {
            const destination = requestedRedirect || getRoleRedirect(user);
            router.replace(destination);
            return;
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router, requestedRedirect]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "#f1f7fb",
        }}
      >
        <Spin size="large" tip="Checking authentication..." />
      </div>
    );
  }

  async function submit(values) {
    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        /*
         * The backend accepts email, username or phone
         * through this field.
         */
        email: values.email.trim(),
        password: values.password,
      });

      const result = unwrapResponse(response);
      const token = result?.data?.token;
      const user = result?.data?.user;

      if (!token || !user) {
        throw new Error(
          "The login response did not contain the required token and user information.",
        );
      }

      localStorage.setItem("token", token);

      localStorage.setItem("user", JSON.stringify(user));

      /*
       * Optional separate values for modules that read
       * permissions or menus directly from localStorage.
       */
      if (Array.isArray(user?.permissions)) {
        localStorage.setItem("permissions", JSON.stringify(user.permissions));
      } else {
        localStorage.removeItem("permissions");
      }

      if (Array.isArray(user?.menus)) {
        localStorage.setItem("menus", JSON.stringify(user.menus));
      } else {
        localStorage.removeItem("menus");
      }

      message.success(result.message || "Logged in successfully.");

      const destination = requestedRedirect || getRoleRedirect(user);

      router.replace(destination);
      router.refresh();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }


  return <main className="auth-page auth-login">
    <section className="auth-story">
      <Link href="/" aria-label="Tukaatu Express home"><Image src="/images/logo.png" alt="Tukaatu Express" width={160} preview={false} /></Link>
      <p className="auth-eyebrow">Your delivery workspace</p>
      <h1>Every order.<br /><span>A clearer picture.</span></h1>
      <p>Shipments, collections and delivery teams. Bring your daily operations together with Tukaatu Express.</p>
      <div className="auth-story-image"><img src="/images/experience/nepal-courier.webp" alt="Illustration of a courier and delivery vehicles in Nepal" width="700" height="466" /></div>
      <div className="auth-trust"><SafetyCertificateOutlined /> Secure access <span>Made for Nepal.</span></div>
    </section>
    <section className="auth-form-region">
      <Link href="/" className="auth-back">← Back to Tukaatu Express</Link>
      <div className="auth-form-card">
        <p className="auth-eyebrow">Welcome back</p><h2>Sign in to your workspace.</h2><p className="auth-description">Use your registered email, username or phone number.</p>
        {accountSetupSuccess && <Alert type="success" showIcon closable message="Account setup completed" description="Your password was created successfully. Sign in to access your account." style={{marginBottom:24}} />}
          <Form
            layout="vertical"
            size="large"
            onFinish={submit}
            requiredMark={false}
            initialValues={{
              email: registeredEmail,
            }}
          >
            <Form.Item
              name="email"
              label="Email, username or phone"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Enter your email, username or phone number.",
                },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Enter login ID"
                autoComplete="username"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                {
                  required: true,
                  message: "Enter your password.",
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
              />
            </Form.Item>

            <Button
              block
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              loading={loading}
              style={{
                height: 48,
                borderRadius: 10,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              Sign In
            </Button>
          </Form>
        <Button type="link" onClick={() => router.push("/forgot-password")} className="auth-forgot">Forgot your password?</Button>
        <div className="auth-register">New to Tukaatu? <Link href="/public/merchant-register">Create a merchant account →</Link></div>
        <p className="auth-footnote">Franchise managers: complete the password setup sent to your registered email before signing in.</p>
      </div>
      <p className="auth-legal"><Link href="/privacy-policy">Privacy policy</Link><span>·</span><Link href="/terms-conditions">Terms & conditions</Link></p>
    </section>
  </main>;
}
