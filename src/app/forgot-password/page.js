'use client';

import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message, Space } from 'antd';
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        email: values.email,
      });
      setSubmitted(true);
      message.success('Password reset link sent to your email.');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <SendOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={3}>Check Your Email</Title>
          <Text type="secondary">
            We've sent a password reset link to {email}. Please check your inbox and click the link to reset your password.
          </Text>
          <Space direction="vertical" style={{ marginTop: 24, width: '100%' }}>
            <Button type="primary" onClick={() => router.push('/login')} block>
              Back to Login
            </Button>
            <Button onClick={() => setSubmitted(false)}>
              Didn't receive the email? Try again
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/login')} style={{ width: 'auto' }}>
            Back to Login
          </Button>
          <Title level={2} style={{ textAlign: 'center' }}>
            Forgot Password?
          </Title>
          <Text type="secondary" style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
          <Form
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ email }}
            onFieldsChange={() => setEmail('')}
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email address' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input
                placeholder="Enter your email"
                size="large"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>
            <Form.Item style={{ marginTop: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                Send Reset Link
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
