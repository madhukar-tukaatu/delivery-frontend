"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Descriptions, Divider, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from "antd";
import { adminCreateShipment, adminQuoteShipment } from "@/services/deliveryOperationsApi";

const { Title, Text } = Typography;

function payload(values) {
  return {
    merchant_id: values.merchant_id,
    pickup_location_id: values.pickup_location_id || null,
    self_drop: !!values.self_drop,
    order_reference: values.order_reference || null,
    customer: { name: values.customer_name, phone: values.customer_phone, email: values.customer_email || null },
    delivery: { address: values.delivery_address, city: values.delivery_city, area: values.delivery_area || null, latitude: values.delivery_latitude || null, longitude: values.delivery_longitude || null },
    package: { type: values.package_type || "parcel", description: values.package_description || null, weight: values.weight, length_cm: values.length_cm || 0, width_cm: values.width_cm || 0, height_cm: values.height_cm || 0, pieces: values.pieces || 1, value: values.declared_value || 0 },
    payment: { type: values.payment_type || "prepaid", pod_amount: values.payment_type === "pod" ? values.pod_amount || 0 : 0, delivery_charge_paid_by: values.delivery_charge_paid_by || "merchant" },
    special_instruction: values.special_instruction || null,
  };
}

export default function AdminCreateShipmentPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const paymentType = Form.useWatch("payment_type", form);

  async function calculate() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setQuote(await adminQuoteShipment(payload(values)));
      message.success("Quote calculated.");
    } catch (error) {
      if (!error?.errorFields) message.error(error?.response?.data?.message || "Quote failed.");
    } finally { setLoading(false); }
  }

  async function create() {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const data = await adminCreateShipment(payload(values));
      message.success("Shipment created.");
      if (data?.shipment?.id) router.push(`/admin/shipments/${data.shipment.id}/operations`);
    } catch (error) {
      if (!error?.errorFields) message.error(error?.response?.data?.message || "Create failed.");
    } finally { setCreating(false); }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card><Title level={3}>Admin Create Shipment</Title><Text type="secondary">Admin can create shipment on behalf of merchant.</Text></Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title="Shipment Form">
            <Form form={form} layout="vertical" initialValues={{ payment_type: "prepaid", delivery_charge_paid_by: "merchant", pieces: 1, package_type: "parcel" }}>
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="merchant_id" label="Merchant ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="pickup_location_id" label="Pickup Location ID"><InputNumber style={{ width: "100%" }} placeholder="optional; default used if blank" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="order_reference" label="Order Ref"><Input /></Form.Item></Col>
              </Row>
              <Divider orientation="left">Customer</Divider>
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="customer_name" label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="customer_phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
              </Row>
              <Divider orientation="left">Delivery</Divider>
              <Form.Item name="delivery_address" label="Address" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="delivery_city" label="City" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="delivery_area" label="Area"><Input /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item name="delivery_latitude" label="Lat"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={4}><Form.Item name="delivery_longitude" label="Lng"><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
              </Row>
              <Divider orientation="left">Package</Divider>
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="weight" label="Weight KG" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="pieces" label="Pieces"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="package_type" label="Type"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="length_cm" label="Length"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="width_cm" label="Width"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="height_cm" label="Height"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
              </Row>
              <Divider orientation="left">Payment</Divider>
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="payment_type" label="Payment"><Select options={[{ value: "prepaid", label: "Prepaid" }, { value: "pod", label: "POD" }]} /></Form.Item></Col>
                {paymentType === "pod" && <Col xs={24} md={8}><Form.Item name="pod_amount" label="POD Amount" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>}
                <Col xs={24} md={8}><Form.Item name="delivery_charge_paid_by" label="Charge Paid By"><Select options={[{ value: "merchant", label: "Merchant" }, { value: "customer", label: "Customer" }]} /></Form.Item></Col>
              </Row>
              <Form.Item name="special_instruction" label="Instruction"><Input.TextArea rows={2} /></Form.Item>
              <Space><Button loading={loading} onClick={calculate}>Calculate</Button><Button type="primary" loading={creating} onClick={create}>Create Shipment</Button></Space>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="Quote Preview">
            {!quote ? <Alert type="info" showIcon message="Calculate to preview route and charges." /> : <Space direction="vertical" style={{ width: "100%" }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Charge">{quote.fare.delivery_charge}</Descriptions.Item>
                <Descriptions.Item label="Collectable">{quote.fare.total_collectable}</Descriptions.Item>
                <Descriptions.Item label="Distance">{quote.fare.distance_km} km</Descriptions.Item>
                <Descriptions.Item label="Weight">{quote.fare.chargeable_weight} kg</Descriptions.Item>
              </Descriptions>
              <Space wrap>{(quote.route.steps || []).map((s) => <Tag key={s} color="blue">{s}</Tag>)}</Space>
              <Text>Origin: {quote.route.origin_sub_branch?.name || quote.route.origin_branch?.name || "-"}</Text>
              <Text>Destination: {quote.route.destination_sub_branch?.name || quote.route.destination_branch?.name || "-"}</Text>
            </Space>}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
