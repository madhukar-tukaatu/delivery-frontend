'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Form, Input, Typography, message, Space, Alert, Spin } from 'antd';
import { ArrowLeftOutlined, SendOutlined, MailOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState(searchParams?.get('email') || '');
  const [submitted, setSubmitted] = useState(false);
  const [form] = Form.useForm();
  const [checking, setChecking] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/admin/dashboard');
    }
    setChecking(false);
  }, [router]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: values.email.trim(),
      });
      
      setEmailInput(values.email.trim());
      setSubmitted(true);
      message.success('Password reset link sent to your email.');
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.errors?.email?.join(', ') ||
                          'Failed to send reset link. Please check your email and try again.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ RESEND LINK - STAYS ON SUCCESS SCREEN
  const handleResendLink = async () => {
    setResendLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: emailInput,
      });
      
      message.success('New password reset link sent to your email!');
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.errors?.email?.join(', ') ||
                          'Failed to resend link. Please try again.';
      message.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px',
          background: 'linear-gradient(135deg, #f3f7fb 0%, #eef3f8 100%)'
        }}
      >
        <Card 
          style={{ 
            maxWidth: 450, 
            width: '100%', 
            textAlign: 'center',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          </div>
          
          <Title level={3} style={{ marginBottom: '12px' }}>
            Check Your Email
          </Title>
          
          <Text type="secondary" style={{ fontSize: '15px', lineHeight: '1.6' }}>
            We've sent a password reset link to <strong>{emailInput}</strong>. 
            <br />
            <br />
            Please check your inbox and click the link to reset your password. 
            The link will expire in 60 minutes.
          </Text>

          <Alert
            type="info"
            icon={<MailOutlined />}
            message="Didn't receive the email?"
            description="Check your spam folder or try requesting a new link below. The link expires in 60 minutes."
            style={{ marginTop: '20px', marginBottom: '20px' }}
          />

          <Space direction="vertical" style={{ marginTop: 24, width: '100%' }} size="middle">
            <Button 
              type="primary" 
              onClick={() => router.push('/login')} 
              block
              size="large"
              style={{ borderRadius: '8px', height: '44px', fontWeight: 600 }}
            >
              Back to Login
            </Button>
            
            {/* ✅ RESEND LINK - STAYS ON THIS PAGE, SENDS FROM HERE */}
            <Button 
              onClick={handleResendLink}
              loading={resendLoading}
              size="large"
              style={{ borderRadius: '8px', height: '44px' }}
              icon={<SendOutlined />}
            >
              {resendLoading ? 'Sending...' : 'Send Another Link to This Email'}
            </Button>

            {/* Change email option */}
            <Button 
              type="text"
              onClick={() => setSubmitted(false)}
              size="large"
              style={{ color: '#015472', fontWeight: 600 }}
            >
              ← Use Different Email
            </Button>
          </Space>

          <Text 
            type="secondary" 
            style={{ 
              fontSize: '12px', 
              marginTop: '20px', 
              display: 'block' 
            }}
          >
            Contact support if you need further assistance
          </Text>
        </Card>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px',
        background: 'linear-gradient(135deg, #f3f7fb 0%, #eef3f8 100%)'
      }}
    >
      <Card 
        style={{ 
          maxWidth: 450, 
          width: '100%',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: '20px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => router.push('/login')} 
            type="text"
            style={{ padding: '0', width: 'auto', color: '#015472' }}
          >
            Back to Login
          </Button>
        </Space>

        <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockOutlined style={{ fontSize: '24px', color: '#015472' }} />
            <Title level={2} style={{ margin: 0, color: '#015472' }}>
              Forgot Password?
            </Title>
          </div>
          
          <Text 
            type="secondary" 
            style={{ 
              display: 'block', 
              marginBottom: '16px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            Enter your registered email address and we'll send you a secure link to reset your password.
          </Text>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          requiredMark={false}
          initialValues={{ email: emailInput }}
        >
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { 
                required: true, 
                message: 'Please enter your email address' 
              },
              { 
                type: 'email', 
                message: 'Please enter a valid email address' 
              },
            ]}
          >
            <Input
              placeholder="Enter your registered email"
              prefix={<MailOutlined />}
              disabled={loading}
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              icon={<SendOutlined />}
              style={{ 
                borderRadius: '8px', 
                height: '44px', 
                fontWeight: 600 
              }}
            >
              Send Reset Link
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '13px' 
            }}
          >
            Remember your password?{' '}
            <a 
              href="/login"
              style={{ color: '#015472', fontWeight: 600 }}
            >
              Login here
            </a>
          </Text>
        </div>

        <Alert
          type="info"
          message="Security Tip"
          description="Never share your password reset link with anyone. The link is personal and expires in 60 minutes."
          style={{ marginTop: '20px', borderRadius: '6px' }}
          showIcon
        />
      </Card>
    </div>
  );
}
