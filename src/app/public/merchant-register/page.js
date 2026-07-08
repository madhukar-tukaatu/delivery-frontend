'use client';

import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { signupMerchant } from '@/services/merchantSignupService';

const { Title, Text } = Typography;

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    try {
      setLoading(true);
      await signupMerchant(values);
      message.success('Merchant account created. Please login to complete onboarding.');
      router.push('/login');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not create merchant account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5', padding: 20 }}>
      <Card style={{ width: '100%', maxWidth: 560 }}>
        <Title level={3}>Merchant Registration</Title>
        <Text type="secondary">Create your account first. You will submit documents after login.</Text>

        <Form layout="vertical" onFinish={submit} style={{ marginTop: 24 }}>
          <Form.Item name="business_name" label="Business Name" rules={[{ required: true }]}>
            <Input placeholder="ABC Fashion Store" />
          </Form.Item>

          <Form.Item name="owner_name" label="Owner Name" rules={[{ required: true }]}>
            <Input placeholder="Owner full name" />
          </Form.Item>

          <Form.Item name="contact_person" label="Contact Person">
            <Input placeholder="Contact person name" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="merchant@example.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input placeholder="98XXXXXXXX" />
          </Form.Item>

          <Form.Item name="password" label="Password" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password />
          </Form.Item>

          <Form.Item name="password_confirmation" label="Confirm Password" dependencies={["password"]} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')); } })]}>
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block>
            Create Merchant Account
          </Button>
        </Form>
      </Card>
    </div>
  );
}
