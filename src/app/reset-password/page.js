'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, Card, Form, Input, Typography, message, Space, Progress, Alert, Checkbox } from 'antd';
import { ArrowLeftOutlined, LockOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams?.get('email') || '';
  const token = searchParams?.get('token') || '';
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [form] = Form.useForm();

  useEffect(() => {
    // Validate token and email on mount
    if (!token || !email) {
      message.error('Invalid or expired password reset link.');
      setTimeout(() => router.push('/forgot-password'), 2000);
    }
  }, [token, email, router]);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25;
    
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e) => {
    const strength = calculatePasswordStrength(e.target.value);
    setPasswordStrength(strength);
  };

  const handleSubmit = async (values) => {
    if (values.password !== values.password_confirmation) {
      message.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        token,
        password: values.password,
        password_confirmation: values.password_confirmation,
        logout_all_devices: values.logout_all_devices === true,
      });
      
      const result = response?.data || {};
      
      // If logout_all_devices is false, stay logged in on this device
      if (values.logout_all_devices === false && result?.data?.token) {
        localStorage.setItem('token', result.data.token);
        if (result?.data?.user) {
          localStorage.setItem('user', JSON.stringify(result.data.user));
        }
      }
      
      setSuccess(true);
      message.success('Password reset successfully!');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        if (values.logout_all_devices === true) {
          // Go to login if logging out all devices
          router.push('/login');
        } else {
          // Go to dashboard if staying logged in
          const user = result?.data?.user;
          if (user) {
            const role = user.role?.toLowerCase() || '';
            const roles = user.roles || [];
            
            if (roles.includes('merchant') || role.includes('merchant')) {
              router.push('/merchant/dashboard');
            } else if (roles.includes('rider') || role.includes('rider')) {
              router.push('/staff/dashboard');
            } else {
              router.push('/admin/dashboard');
            }
          } else {
            router.push('/admin/dashboard');
          }
        }
      }, 2000);
    } catch (error) {
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.errors?.password?.join(', ') ||
                      'Failed to reset password. Please try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 25) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 75) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '#d9d9d9';
    if (passwordStrength <= 25) return '#ff4d4f';
    if (passwordStrength <= 50) return '#faad14';
    if (passwordStrength <= 75) return '#1890ff';
    return '#52c41a';
  };

  if (success) {
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
            Password Reset Successful!
          </Title>
          
          <Text type="secondary" style={{ fontSize: '15px', lineHeight: '1.6', display: 'block' }}>
            Your password has been updated successfully. 
            <br />
            <br />
            {form.getFieldValue('logout_all_devices') 
              ? 'You have been logged out from all devices. Please login with your new password.' 
              : 'You are logged in on this device. You have been logged out from other devices.'}
          </Text>

          <Button 
            type="primary" 
            onClick={() => {
              if (form.getFieldValue('logout_all_devices')) {
                router.push('/login');
              } else {
                router.push('/admin/dashboard');
              }
            }} 
            style={{ marginTop: '24px', borderRadius: '8px', height: '44px', fontWeight: 600 }}
            size="large"
            block
          >
            {form.getFieldValue('logout_all_devices') ? 'Go to Login' : 'Go to Dashboard'}
          </Button>
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
            onClick={() => router.push('/forgot-password')} 
            type="text"
            style={{ padding: '0', width: 'auto', color: '#015472' }}
          >
            Back to Forgot Password
          </Button>
        </Space>

        <Space direction="vertical" style={{ width: '100%', marginBottom: '24px' }} size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockOutlined style={{ fontSize: '24px', color: '#015472' }} />
            <Title level={2} style={{ margin: 0, color: '#015472' }}>
              Reset Password
            </Title>
          </div>
          
          <Text 
            type="secondary" 
            style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            Create a strong, unique password for your account.
          </Text>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="password"
            label="New Password"
            rules={[
              { 
                required: true, 
                message: 'Please enter a new password' 
              },
              { 
                min: 8, 
                message: 'Password must be at least 8 characters' 
              },
            ]}
            hasFeedback
          >
            <Input.Password 
              placeholder="Enter new password" 
              prefix={<LockOutlined />}
              onChange={handlePasswordChange}
              disabled={loading}
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <Progress 
                percent={passwordStrength} 
                strokeColor={getPasswordStrengthColor()}
                status={passwordStrength < 50 ? 'exception' : 'success'}
                size="small"
              />
              <Text 
                style={{ 
                  fontSize: '12px', 
                  marginTop: '4px', 
                  color: getPasswordStrengthColor(),
                  fontWeight: 600
                }}
              >
                Password Strength: {getPasswordStrengthLabel()}
              </Text>
            </div>
          )}

          <Form.Item
            name="password_confirmation"
            label="Confirm New Password"
            rules={[
              { 
                required: true, 
                message: 'Please confirm your new password' 
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
            dependencies={['password']}
            hasFeedback
          >
            <Input.Password 
              placeholder="Confirm new password" 
              prefix={<LockOutlined />}
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="logout_all_devices"
            label=""
            valuePropName="checked"
            initialValue={false}
            style={{ marginTop: 24, marginBottom: 24 }}
          >
            <Checkbox>
              Logout from all devices and login on this device only
            </Checkbox>
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{ 
                borderRadius: '8px', 
                height: '44px', 
                fontWeight: 600 
              }}
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>

        <Alert
          type="warning"
          message="Password Requirements"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li>At least 8 characters long</li>
              <li>Contains uppercase letter (A-Z)</li>
              <li>Contains lowercase letter (a-z)</li>
              <li>Contains number (0-9)</li>
              <li>Link expires in 60 minutes</li>
            </ul>
          }
          style={{ marginTop: '20px', borderRadius: '6px' }}
          showIcon
        />

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
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense 
      fallback={
        <div 
          style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f3f7fb 0%, #eef3f8 100%)'
          }}
        >
          <Text>Loading...</Text>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
