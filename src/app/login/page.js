"use client";
import { Button, Card, Form, Input, Typography, Alert } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { routeForRole, saveAuth } from "@/lib/auth";
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  async function onFinish(values) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", values);
      const { token, user } = res.data.data;
      saveAuth(token, user);
      router.push(routeForRole(user.role, user));
      console.log("Logged in as", user);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>Courier Delivery Gateway</Typography.Title>
        <Typography.Paragraph type="secondary">
          Demo: admin@example.com / password
        </Typography.Paragraph>
        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} />
        )}
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ email: "admin@example.com", password: "password" }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Button block type="primary" htmlType="submit" loading={loading}>
            Login
          </Button>
        </Form>
      </Card>
    </main>
  );
}
