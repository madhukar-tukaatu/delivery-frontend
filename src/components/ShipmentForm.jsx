'use client';

import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import RoutingMapPicker from '@/features/routing/RoutingMapPicker';

export default function ShipmentForm({ mode = 'admin' }) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [routing, setRouting] = useState({ weight: 1, cod_amount: 0 });
  const [manualOverride, setManualOverride] = useState(false);
  const endpoint = mode === 'merchant' ? '/merchant/shipments' : '/admin/shipments';

  async function submit(values) {
    try {
      const isMerchant = mode === 'merchant';
      if (isMerchant && (!routing.pickup || !routing.delivery)) {
        message.error('Please select pickup and delivery pins on the map.');
        return;
      }

      const payload = {
        ...values,
        manual_branch_override: manualOverride,
        pickup_lat: routing.pickup?.lat,
        pickup_lng: routing.pickup?.lng,
        delivery_lat: routing.delivery?.lat,
        delivery_lng: routing.delivery?.lng,
        weight: values.weight || routing.weight || 1,
        cod_amount: values.cod_amount ?? routing.cod_amount ?? 0,
      };

      const res = await api.post(endpoint, payload);
      message.success('Shipment created: ' + res.data.data.tracking_number);
      router.push(mode === 'merchant' ? '/merchant/shipments' : '/admin/shipments');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Unable to create shipment');
    }
  }

  return (
    <Card title="Create Delivery Order">
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ payment_type: 'cod', delivery_charge_paid_by: 'customer', quantity: 1, weight: 1 }}
        onValuesChange={(changed, all) => {
          if ('weight' in changed || 'cod_amount' in changed) {
            setRouting((prev) => ({ ...prev, weight: all.weight || 1, cod_amount: all.cod_amount || 0 }));
          }
        }}
      >
        {mode === 'admin' && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Form.Item label="Manual Branch Override">
              <Switch checked={manualOverride} onChange={setManualOverride} />
            </Form.Item>
            {manualOverride && (
              <div className="form-grid">
                <Form.Item name="origin_branch_id" label="Origin Branch ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="origin_sub_branch_id" label="Origin Sub-Branch ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="destination_branch_id" label="Destination Branch ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="destination_sub_branch_id" label="Destination Sub-Branch ID"><InputNumber style={{ width: '100%' }} /></Form.Item>
              </div>
            )}
          </Card>
        )}

        {!manualOverride && <RoutingMapPicker value={routing} onChange={setRouting} />}

        <div className="form-grid">
          {mode === 'merchant' && <Form.Item name="merchant_order_id" label="Merchant Order ID" rules={[{ required: true }]}><Input /></Form.Item>}
          {mode === 'admin' && <Form.Item name="merchant_id" label="Merchant ID"><InputNumber style={{ width: '100%' }} /></Form.Item>}

          <Form.Item name="pickup_name" label="Pickup Name"><Input /></Form.Item>
          <Form.Item name="pickup_phone" label="Pickup Phone"><Input /></Form.Item>
          <Form.Item name="pickup_address" label="Pickup Address" rules={mode === 'merchant' ? [{ required: true }] : []}><Input /></Form.Item>
          <Form.Item name="pickup_city" label="Pickup City"><Input /></Form.Item>
          <Form.Item name="pickup_area" label="Pickup Area"><Input /></Form.Item>

          <Form.Item name="receiver_name" label="Receiver Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="receiver_phone" label="Receiver Phone" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="receiver_address" label="Receiver Address" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="receiver_city" label="Receiver City"><Input /></Form.Item>
          <Form.Item name="receiver_area" label="Receiver Area"><Input /></Form.Item>

          <Form.Item name="description" label="Product Description"><Input /></Form.Item>
          <Form.Item name="quantity" label="Quantity"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="weight" label="Weight KG"><InputNumber min={0.1} step={0.1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="declared_value" label="Declared Value"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="payment_type" label="Payment Type"><Select options={[{value:'cod',label:'COD'},{value:'prepaid',label:'Prepaid'},{value:'to_pay',label:'To Pay'}]} /></Form.Item>
          <Form.Item name="cod_amount" label="COD Amount"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="delivery_charge_paid_by" label="Delivery Charge Paid By"><Select options={[{value:'customer',label:'Customer'},{value:'merchant',label:'Merchant'}]} /></Form.Item>
        </div>
        <Button type="primary" htmlType="submit">Create Shipment</Button>
      </Form>
    </Card>
  );
}
