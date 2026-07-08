'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import CoordinatePicker from '@/components/maps/CoordinatePicker';
import { createMerchantShipment, getMerchantPickupLocations } from '@/services/merchantShipmentService';
import { getMerchantOnboarding } from '@/services/merchantOnboardingService';

const { Title, Text } = Typography;

export default function MerchantCreateShipmentPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [useCustomPickup, setUseCustomPickup] = useState(false);

  useEffect(() => {
    async function load() {
      const onboarding = await getMerchantOnboarding();
      setMerchant(onboarding);

      const locations = await getMerchantPickupLocations().catch(() => []);
      const rows = Array.isArray(locations) ? locations : locations?.data || [];
      setPickupLocations(rows);
    }

    load().catch(() => message.error('Could not load merchant data.'));
  }, []);

  const submit = async (values) => {
    if (merchant?.status !== 'active') {
      message.warning('Your merchant account must be approved before creating shipments.');
      router.push('/merchant/onboarding');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        merchant_order_id: values.merchant_order_id,
        pickup_location_id: useCustomPickup ? null : values.pickup_location_id,
        pickup_name: values.pickup_name,
        pickup_phone: values.pickup_phone,
        pickup_address: values.pickup_address,
        pickup_city: values.pickup_city,
        pickup_area: values.pickup_area,
        pickup_lat: values.pickup_lat,
        pickup_lng: values.pickup_lng,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        customer_address: values.customer_address,
        customer_city: values.customer_city,
        customer_area: values.customer_area,
        delivery_lat: values.delivery_lat,
        delivery_lng: values.delivery_lng,
        parcel_type: values.parcel_type || 'product',
        product_description: values.product_description,
        quantity: values.quantity || 1,
        weight: values.weight || 1,
        fragile: values.fragile || false,
        declared_value: values.declared_value || 0,
        payment_type: values.payment_type,
        cod_amount: values.payment_type === 'cod' ? values.cod_amount || 0 : 0,
        delivery_charge_paid_by: values.delivery_charge_paid_by || 'customer',
      };

      const shipment = await createMerchantShipment(payload);
      message.success('Shipment created. Pickup task will be assigned automatically.');
      router.push(`/merchant/shipments/${shipment.id || shipment.tracking_number}`);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not create shipment.');
    } finally {
      setLoading(false);
    }
  };

  if (merchant && merchant.status !== 'active') {
    return (
      <Card>
        <Title level={3}>Shipment Creation Locked</Title>
        <Text>Your merchant account is not approved yet. Complete onboarding and wait for Super Admin verification.</Text>
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => router.push('/merchant/onboarding')}>Go to Onboarding</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Title level={3}>Create Shipment</Title>
      <Text type="secondary">Only enter pickup choice, receiver, parcel, and payment details. Branch routing is automatic.</Text>

      <Form form={form} layout="vertical" onFinish={submit} style={{ marginTop: 24 }} initialValues={{ payment_type: 'cod', delivery_charge_paid_by: 'customer', quantity: 1, weight: 1 }}>
        <Card size="small" title="Order" style={{ marginBottom: 16 }}>
          <Form.Item name="merchant_order_id" label="Merchant Order ID" rules={[{ required: true }]}>
            <Input placeholder="ORD-1001" />
          </Form.Item>
        </Card>

        <Card size="small" title="Pickup" style={{ marginBottom: 16 }}>
          <Form.Item label="Pickup Type">
            <Select value={useCustomPickup ? 'custom' : 'saved'} onChange={(value) => setUseCustomPickup(value === 'custom')} options={[{ value: 'saved', label: 'Use saved pickup location' }, { value: 'custom', label: 'Use custom pickup location' }]} />
          </Form.Item>

          {!useCustomPickup && (
            <Form.Item name="pickup_location_id" label="Pickup Location" rules={[{ required: true }]}>
              <Select
                placeholder="Select pickup location"
                options={pickupLocations.map((item) => ({ value: item.id, label: `${item.name} - ${item.address}` }))}
              />
            </Form.Item>
          )}

          {useCustomPickup && (
            <>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="pickup_name" label="Pickup Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="pickup_phone" label="Pickup Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="pickup_address" label="Pickup Address" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="pickup_city" label="Pickup City" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="pickup_area" label="Pickup Area"><Input /></Form.Item></Col>
              </Row>
              <CoordinatePicker form={form} latName="pickup_lat" lngName="pickup_lng" />
            </>
          )}
        </Card>

        <Card size="small" title="Receiver / Delivery" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item name="customer_name" label="Receiver Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="customer_phone" label="Receiver Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="customer_email" label="Receiver Email"><Input /></Form.Item>
          <Form.Item name="customer_address" label="Delivery Address" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item name="customer_city" label="Delivery City" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="customer_area" label="Delivery Area"><Input /></Form.Item></Col>
          </Row>
          <CoordinatePicker form={form} latName="delivery_lat" lngName="delivery_lng" />
        </Card>

        <Card size="small" title="Parcel & Payment" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="parcel_type" label="Parcel Type"><Select options={[{ value: 'product' }, { value: 'document' }, { value: 'fragile' }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="quantity" label="Quantity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="weight" label="Weight (kg)" rules={[{ required: true }]}><InputNumber min={0.1} step={0.1} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="product_description" label="Product Description"><Input /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={8}><Form.Item name="payment_type" label="Payment Type"><Select options={[{ value: 'cod', label: 'COD' }, { value: 'prepaid', label: 'Prepaid' }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="cod_amount" label="COD Amount"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="delivery_charge_paid_by" label="Delivery Charge Paid By"><Select options={[{ value: 'customer', label: 'Customer' }, { value: 'merchant', label: 'Merchant' }]} /></Form.Item></Col>
          </Row>
        </Card>

        <Button type="primary" htmlType="submit" loading={loading}>Create Shipment</Button>
      </Form>
    </Card>
  );
}
