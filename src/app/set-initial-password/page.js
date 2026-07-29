"use client";

import {
  Suspense,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  message,
} from "antd";

import {
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import api from "@/lib/api";

const {
  Title,
  Text,
} = Typography;

function errorMessage(
  error,
  fallback,
) {
  const validationErrors =
    error?.response?.data?.errors;

  if (validationErrors) {
    const firstError =
      Object.values(
        validationErrors,
      )
        .flat()
        .find(Boolean);

    if (firstError) {
      return String(firstError);
    }
  }

  return (
    error?.response?.data?.message ||
    fallback
  );
}

function SetInitialPasswordContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const [loading, setLoading] =
    useState(false);

  const token =
    searchParams.get("token") || "";

  const email =
    searchParams.get("email") || "";

  const invalidLink =
    !token || !email;

  const submit = async (
    values,
  ) => {
    try {
      setLoading(true);

      const response =
        await api.post(
          "/auth/set-initial-password",
          {
            token,
            email,

            password:
              values.password,

            password_confirmation:
              values.password_confirmation,
          },
        );

      message.success(
        response?.data?.message ||
          "Password created successfully.",
      );

      const redirectUrl =
        response?.data?.redirect_url ||
        `/login?account_setup=success&email=${encodeURIComponent(
          email,
        )}`;

      router.replace(
        redirectUrl,
      );
    } catch (error) {
      message.error(
        errorMessage(
          error,
          "The account setup link is invalid or has expired.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,

        background:
          "linear-gradient(135deg, #f3f6fa 0%, #e8eef7 100%)",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 12,
        }}
      >
        <Space
          direction="vertical"
          size={4}
          style={{
            width: "100%",
            marginBottom: 22,
          }}
        >
          <Title
            level={3}
            style={{
              margin: 0,
            }}
          >
            Set Up Your Account
          </Title>

          <Text type="secondary">
            Create your password to
            access the Tukaatu Express
            admin portal.
          </Text>
        </Space>

        {invalidLink ? (
          <Alert
            type="error"
            showIcon
            message="Invalid account setup link"
            description="The link is missing the required token or registered email."
          />
        ) : (
          <Form
            layout="vertical"
            onFinish={submit}
          >
            <Form.Item
              label="Registered Email"
            >
              <Input
                value={email}
                disabled
                prefix={
                  <MailOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Create Password"
              rules={[
                {
                  required: true,
                  message:
                    "Enter your password.",
                },
                {
                  min: 8,
                  message:
                    "Use at least 8 characters.",
                },
                {
                  pattern:
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,

                  message:
                    "Include uppercase, lowercase and a number.",
                },
              ]}
            >
              <Input.Password
                prefix={
                  <LockOutlined />
                }
                autoComplete="new-password"
                placeholder="Create a secure password"
              />
            </Form.Item>

            <Form.Item
              name="password_confirmation"
              label="Confirm Password"
              dependencies={[
                "password",
              ]}
              rules={[
                {
                  required: true,
                  message:
                    "Confirm your password.",
                },

                ({
                  getFieldValue,
                }) => ({
                  validator(
                    _,
                    value,
                  ) {
                    if (
                      !value ||
                      getFieldValue(
                        "password",
                      ) === value
                    ) {
                      return Promise.resolve();
                    }

                    return Promise.reject(
                      new Error(
                        "The passwords do not match.",
                      ),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={
                  <LockOutlined />
                }
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
            </Form.Item>

            <Button
              block
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
            >
              Create Password
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}

function LoadingView() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Spin size="large" />
    </div>
  );
}

export default function SetInitialPasswordPage() {
  return (
    <Suspense
      fallback={
        <LoadingView />
      }
    >
      <SetInitialPasswordContent />
    </Suspense>
  );
}