'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, Card, Form, Input, Typography, message, Space } from 'antd';
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Validate token and email on mount
    if (!token || !email) {
      message.error('Invalid or expired password reset link.');
      setTimeout(() => router.push('/forgot-password'), 2000);
    }
  }, [token, email, router]);

  const handleSubmit = async (values) => {
    if (values.password !== values.password_confirmation) {
      message.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        token,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      setSuccess(true);
      message.success('Password reset successfully!');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Title level={3}>Password Reset Successful!</Title>
          <Text type="secondary">
            Your password has been updated. You will be redirected to the login page shortly...
          </Text>
          <Button type="primary" onClick={() => router.push('/login')} style={{ marginTop: 16 }}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/forgot-password')} style={{ width: 'auto' }}>
            Back to Forgot Password
          </Button>
          <Title level={2} style={{ textAlign: 'center' }}>
            Reset Password
          </Title>
          <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
            Enter your new password below.
          </Text>
          <Form
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="password"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
                { pattern: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
                { pattern: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
                { pattern: /[0-9]/, message: 'Password must contain at least one number' },
              ]}
              hasFeedback
            >
              <Input.Password placeholder="Enter new password" size="large" />
            </Form.Item>
            <Form.Item
              name="password_confirmation"
              label="Confirm New Password"
              rules={[
                { required: true, message: 'Please confirm your new password' },
              ]}
              dependencies={['password']}
            >
              <Input.Password placeholder="Confirm new password" size="large" />
            </Form.Item>
            <Form.Item style={{ marginTop: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
            Remember your password? <a href="/login">Login here</a>
          </Text>
        </Space>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography.Text>Loading...</Typography.Text></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
