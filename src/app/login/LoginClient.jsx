"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Form,
  Image,
  Input,
  Typography,
  message,
} from "antd";
import {
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";

import api from "@/lib/api";
import styles from "./login.module.css";

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
 * Branch managers use the existing admin portal.
 * Merchants and operational staff use their own portals.
 */
function getRoleRedirect(user) {
  const role = getPrimaryRole(user);

  const merchantRoles = [
    "merchant",
    "merchant_owner",
    "merchant_admin",
    "merchant_staff",
  ];

  const staffRoles = [
    "booking_staff",
    "pickup_staff",
    "dispatch_staff",
    "delivery_staff",
    "warehouse_staff",
    "branch_staff",
  ];

  if (merchantRoles.includes(role)) {
    return "/merchant/dashboard";
  }

  if (staffRoles.includes(role)) {
    return "/staff/dashboard";
  }

  if (role === "rider") {
    return "/rider/dashboard";
  }

  /*
   * Super admins, admins, branch managers,
   * franchise managers and other internal users.
   */
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

  const accountSetupSuccess = searchParams.get("account_setup") === "success";

  const registeredEmail = searchParams.get("email") || "";

  const requestedRedirect = getSafeRedirect(searchParams.get("redirect"));

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

  return (
    <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <div className={styles.shell}>
        <section className={styles.brandPanel} aria-label="Tukaatu Express">
          <div className={styles.brandGlow} aria-hidden="true" />
          <div className={styles.brandContent}>
            <Image
              className={styles.logo}
              src="/images/logo.png"
              alt="Tukaatu Express"
              width={238}
              height={72}
              preview={false}
            />

            <div className={styles.brandCopy}>
              <span className={styles.eyebrow}>Delivery command center</span>
              <Title className={styles.heroTitle}>
                Every delivery.<br />One clear view.
              </Title>
              <Paragraph className={styles.heroText}>
                Run branches, merchants, pickups, COD and reporting from one
                secure operations platform.
              </Paragraph>
            </div>

            <div className={styles.proofGrid}>
              <div><strong>Live</strong><span>Operations</span></div>
              <div><strong>Secure</strong><span>Role access</span></div>
              <div><strong>One</strong><span>Connected system</span></div>
            </div>
          </div>

          <div className={styles.brandFooter}>
            <span className={styles.statusDot} /> Systems operational
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.mobileBrand}>
            <Image src="/images/logo.png" alt="Tukaatu Express" width={176} preview={false} />
          </div>

          <div className={styles.loginCard}>
            <div className={styles.cardIcon} aria-hidden="true">
              <SafetyCertificateOutlined />
            </div>
            <div className={styles.formHeader}>
              <Text className={styles.portalLabel}>Secure portal</Text>
              <Title level={2} className={styles.formTitle}>Welcome back</Title>
              <Text className={styles.formSubtitle}>
                Sign in to continue to your operations workspace.
              </Text>
            </div>

          {accountSetupSuccess && (
            <Alert
              type="success"
              showIcon
              closable
              message="Account setup completed"
              description="Your password was created successfully. Sign in to access your account."
              style={{
                marginBottom: 22,
                borderRadius: 10,
              }}
            />
          )}

          <Form
            className={styles.form}
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
                className={styles.input}
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
                className={styles.input}
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
              className={styles.submitButton}
            >
              Sign in securely
            </Button>
          </Form>

          <Divider className={styles.divider} />

          <Text className={styles.helpText}>
            Franchise managers must complete the password setup sent to their
            registered email before signing in.
          </Text>
          </div>

          <p className={styles.copyright}>© 2026 Tukaatu Express · Authorized access only</p>
        </section>
      </div>
    </main>
  );
}
