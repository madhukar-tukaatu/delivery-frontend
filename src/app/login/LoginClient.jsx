"use client";

import { useState } from "react";
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
} from "antd";
import {
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
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
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.15fr) minmax(420px, 0.85fr)",
        background:
          "linear-gradient(135deg, #071d34 0%, #0b3154 55%, #145b87 100%)",
      }}
    >
      <section
        style={{
          display: "flex",
          alignItems: "center",
          padding: "56px clamp(32px, 7vw, 110px)",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.06)",
            top: -160,
            right: -130,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 270,
            height: 270,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            bottom: -110,
            left: -70,
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: 650,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Space direction="vertical" size={22} style={{ width: "100%" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 350,
                  height: 150,
                  borderRadius: 0,
                  // background: "rgba(255,255,255,0.14)",
                  // border: "1px solid rgba(255,255,255,0.18)",
                  overflow: "hidden",
                }}
              >
                <Image
                  src="/images/logo.png"
                  alt="Logo"
                  width={350}
                  height={150}
                  preview={false}
                  style={{ objectFit: "contain" }}
                />
              </div>
              {/* <Text
                style={{
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Tukaatu Express
              </Text> */}
            </div>

            <Title
              style={{
                color: "#ffffff",
                margin: 0,
                fontSize: "clamp(38px, 5vw, 68px)",
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
              }}
            >
              One platform for complete delivery operations.
            </Title>

            <Paragraph
              style={{
                color: "rgba(255,255,255,0.76)",
                fontSize: 17,
                lineHeight: 1.8,
                maxWidth: 580,
                margin: 0,
              }}
            >
              Manage branches, franchises, merchants, shipments, pricing,
              pickups, deliveries, COD and reports from one secure system.
            </Paragraph>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 8,
              }}
            >
              {["Secure access", "Role-based menus", "Live operations"].map(
                (item) => (
                  <span
                    key={item}
                    style={{
                      padding: "8px 13px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 13,
                    }}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </Space>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          placeItems: "center",
          padding: 28,
          background: "linear-gradient(180deg, #ffffff 0%, #f5f8fb 100%)",
        }}
      >
        <Card
          bordered={false}
          style={{
            width: "100%",
            maxWidth: 470,
            borderRadius: 20,
            boxShadow: "0 24px 65px rgba(15, 23, 42, 0.14)",
          }}
          styles={{
            body: {
              padding: "clamp(26px, 4vw, 42px)",
            },
          }}
        >
          <Space
            direction="vertical"
            size={5}
            style={{
              width: "100%",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: "#1677ff",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: 12,
              }}
            >
              Secure portal
            </Text>

            <Title
              level={2}
              style={{
                margin: 0,
                color: "#0f172a",
              }}
            >
              Sign in
            </Title>

            <Text type="secondary">
              Enter your registered email, username or phone number.
            </Text>
          </Space>

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

          <Divider style={{ margin: "26px 0 20px" }} />

          <Text
            type="secondary"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Franchise managers must complete the password setup sent to their
            registered email before signing in.
          </Text>
        </Card>
      </section>

      <style jsx global>{`
        @media (max-width: 900px) {
          main {
            grid-template-columns: 1fr !important;
          }

          main > section:first-child {
            display: none !important;
          }

          main > section:last-child {
            min-height: 100vh;
          }
        }
      `}</style>
    </main>
  );
}
