'use client';

import { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Row, Col, Space, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, MailOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, roles, can } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      setLoading(false);
    } else if (!loading) {
      // User not authenticated, redirect to login
      router.push('/login');
    }
  }, [user, form, loading, router]);

  const handleProfileUpdate = async (values) => {
    setSubmitting(true);
    try {
      await api.put('/auth/profile', {
        name: values.name,
        phone: values.phone || null,
      });
      message.success('Profile updated successfully!');
      // Refresh user data
      const response = await api.get('/auth/me');
      setUser(response?.data?.data || response?.data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (values) => {
    setSubmitting(true);
    try {
      await api.post('/auth/profile/password', {
        current_password: values.current_password,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      message.success('Password changed successfully! Please login with your new password.');
      form.resetFields(['current_password', 'password', 'password_confirmation']);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography.Text>Loading profile...</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f7f8fa', minHeight: '100vh' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Title level={2} style={{ margin: 0 }}>
            <UserOutlined /> My Profile
          </Title>
          <Text type="secondary">Manage your account details and security settings</Text>
        </Col>

        {/* Profile Information */}
        <Col xs={24} md={12}>
          <Card title="Personal Information" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileUpdate}
              initialValues={{
                name: user?.name || '',
                email: user?.email || '',
                phone: user?.phone || '',
              }}
            >
              <Form.Item
                name="name"
                label="Full Name"
                rules={[{ required: true, message: 'Please enter your name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter your full name" size="large" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email Address"
                rules={[{ required: true, message: 'Please enter your email' }, { type: 'email', message: 'Invalid email format' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter your email" size="large" disabled />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[{ pattern: /^[\d+\s\-()]*$/, message: 'Invalid phone format' }]}
              >
                <Input placeholder="Enter your phone number" size="large" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                  Update Profile
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Change Password */}
        <Col xs={24} md={12}>
          <Card title="Change Password" bordered={false}>
            <Form
              layout="vertical"
              onFinish={handleChangePassword}
            >
              <Form.Item
                name="current_password"
                label="Current Password"
                rules={[{ required: true, message: 'Please enter your current password' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Enter current password" size="large" />
              </Form.Item>

              <Form.Item
                name="password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter a new password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                  { pattern: /[A-Z]/, message: 'Must contain at least one uppercase letter' },
                  { pattern: /[a-z]/, message: 'Must contain at least one lowercase letter' },
                  { pattern: /[0-9]/, message: 'Must contain at least one number' },
                ]}
                hasFeedback
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Enter new password" size="large" />
              </Form.Item>

              <Form.Item
                name="password_confirmation"
                label="Confirm New Password"
                rules={[
                  { required: true, message: 'Please confirm your new password' },
                ]}
                dependencies={['password']}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" size="large" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} icon={<LockOutlined />}>
                  Change Password
                </Button>
              </Form.Item>
            </Form>

            <Divider />
            
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>Password Requirements:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
              </ul>
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
