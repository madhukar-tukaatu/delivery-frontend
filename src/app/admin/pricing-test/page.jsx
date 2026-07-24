"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalculatorOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  pricingSimulatorApi,
  serviceTypesApi,
} from "@/lib/admin-pricing-api";
import { money } from "@/lib/pricing-formatters";

const { Title, Text } = Typography;

const DEFAULT_VALUES = {
  store_id: 2,
  pickup_address: "Jadibuti Store, Kathmandu",
  pickup_latitude: 27.674969,
  pickup_longitude: 85.3518605,
  delivery_address: "Jagati, Bhaktapur",
  delivery_latitude: 27.6648125,
  delivery_longitude: 85.4364414,
  payment_type: "prepaid",
  pod_amount: 0,
  service_type: "standard",
  products: [
    {
      product_id: "P-001",
      name: "Test Product",
      quantity: 1,
      unit_weight: 1,
      unit_price: 1000,
      parcel_type: "non_fragile",
    },
  ],
};

function cleanPayload(values) {
  const products = (values.products || []).map((product) => {
    const cleaned = { ...product };
    ["product_id", "length_cm", "width_cm", "height_cm"].forEach((key) => {
      if (cleaned[key] === "" || cleaned[key] === undefined || cleaned[key] === null) {
        delete cleaned[key];
      }
    });
    return cleaned;
  });

  return {
    ...values,
    store_id: values.store_id || undefined,
    pod_amount: values.payment_type === "pod" ? Number(values.pod_amount || 0) : 0,
    products,
  };
}

export default function PricingSimulatorPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const paymentType = Form.useWatch("payment_type", form);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await serviceTypesApi.list({ per_page: 100, is_active: true });
        setServiceTypes(response.data?.data || []);
      } catch (error) {
        messageApi.error(error.message);
      }
    }

    loadServices();
  }, [messageApi]);

  async function calculate(values) {
    setLoading(true);
    try {
      const response = await pricingSimulatorApi.calculate(cleanPayload(values));
      setResult(response.data || null);
      messageApi.success(response.message || "Pricing simulation completed.");
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  const packetColumns = [
    { title: "Packet", dataIndex: "packet_reference", fixed: "left", width: 120 },
    { title: "Product", dataIndex: "name", width: 180 },
    {
      title: "Type",
      dataIndex: "parcel_type",
      width: 120,
      render: (value) => <Tag color={value === "fragile" ? "volcano" : "blue"}>{value}</Tag>,
    },
    { title: "Actual KG", dataIndex: "actual_weight_kg", width: 110 },
    {
      title: "Volumetric KG",
      dataIndex: "volumetric_weight_kg",
      width: 130,
      render: (value) => value ?? "—",
    },
    { title: "Chargeable KG", dataIndex: "chargeable_weight_kg", width: 130 },
    { title: "Weight Source", dataIndex: "weight_source", width: 140 },
    { title: "Base Share", dataIndex: "allocated_base_rate", width: 120, render: (value) => money(value) },
    { title: "Weight Share", dataIndex: "allocated_weight_charge", width: 120, render: (value) => money(value) },
    { title: "Fragile Charge", width: 130, render: (_, row) => money(row.fragile?.total) },
    { title: "Packet Subtotal", dataIndex: "packet_subtotal", width: 140, render: (value) => <Text strong>{money(value)}</Text> },
  ];

  const breakdown = result?.breakdown || {};

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Price Simulator</Title>
          <Text type="secondary">Run the real pricing engine without storing a quote.</Text>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              form.resetFields();
              setResult(null);
            }}
          >
            Reset
          </Button>
        </Col>
      </Row>

      <Form form={form} layout="vertical" initialValues={DEFAULT_VALUES} onFinish={calculate}>
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={14}>
            <Card title="Shipment and Address Details">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="Store ID" name="store_id">
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Service Type" name="service_type" rules={[{ required: true }]}>
                    <Select
                      options={(serviceTypes.length ? serviceTypes : [
                        { code: "standard", name: "Standard" },
                        { code: "express", name: "Express" },
                        { code: "same_day", name: "Same Day" },
                      ]).map((item) => ({ value: item.code, label: item.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Payment Type" name="payment_type" rules={[{ required: true }]}>
                    <Select options={[
                      { value: "prepaid", label: "Prepaid" },
                      { value: "pod", label: "POD / COD" },
                    ]} />
                  </Form.Item>
                </Col>
                {paymentType === "pod" && (
                  <Col xs={24} md={8}>
                    <Form.Item label="POD Amount" name="pod_amount" rules={[{ required: true }]}>
                      <InputNumber min={0} addonBefore="NPR" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Divider orientation="left">Pickup</Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label="Pickup Address" name="pickup_address" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Pickup Latitude" name="pickup_latitude" rules={[{ required: true }]}>
                    <InputNumber step={0.000001} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Pickup Longitude" name="pickup_longitude" rules={[{ required: true }]}>
                    <InputNumber step={0.000001} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Delivery</Divider>
              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item label="Delivery Address" name="delivery_address" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Delivery Latitude" name="delivery_latitude" rules={[{ required: true }]}>
                    <InputNumber step={0.000001} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Delivery Longitude" name="delivery_longitude" rules={[{ required: true }]}>
                    <InputNumber step={0.000001} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Products" style={{ marginTop: 20 }}>
              <Alert
                type="info"
                showIcon
                message="Each product quantity becomes separate physical packets."
                description="Dimensions are optional. When all three are supplied, volumetric weight is compared with actual weight."
                style={{ marginBottom: 16 }}
              />

              <Form.List name="products">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card
                        key={key}
                        size="small"
                        title={`Product ${index + 1}`}
                        extra={
                          fields.length > 1 ? (
                            <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          ) : null
                        }
                      >
                        <Row gutter={12}>
                          <Col xs={24} md={8}>
                            <Form.Item {...restField} label="Product ID" name={[name, "product_id"]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={16}>
                            <Form.Item {...restField} label="Name" name={[name, "name"]} rules={[{ required: true }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item {...restField} label="Quantity" name={[name, "quantity"]} rules={[{ required: true }]}>
                              <InputNumber min={1} step={1} style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item {...restField} label="Unit Weight" name={[name, "unit_weight"]} rules={[{ required: true }]}>
                              <InputNumber min={0.001} step={0.1} addonAfter="KG" style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item {...restField} label="Unit Price" name={[name, "unit_price"]} rules={[{ required: true }]}>
                              <InputNumber min={0} addonBefore="NPR" style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <Form.Item {...restField} label="Parcel Type" name={[name, "parcel_type"]} rules={[{ required: true }]}>
                              <Select options={[
                                { value: "non_fragile", label: "Non-Fragile" },
                                { value: "fragile", label: "Fragile" },
                              ]} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item {...restField} label="Length" name={[name, "length_cm"]}>
                              <InputNumber min={0.001} addonAfter="CM" style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item {...restField} label="Width" name={[name, "width_cm"]}>
                              <InputNumber min={0.001} addonAfter="CM" style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item {...restField} label="Height" name={[name, "height_cm"]}>
                              <InputNumber min={0.001} addonAfter="CM" style={{ width: "100%" }} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}

                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => add({
                        product_id: "",
                        name: "",
                        quantity: 1,
                        unit_weight: 1,
                        unit_price: 0,
                        parcel_type: "non_fragile",
                      })}
                    >
                      Add Product
                    </Button>
                  </Space>
                )}
              </Form.List>

              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<CalculatorOutlined />}
                loading={loading}
                block
                style={{ marginTop: 20 }}
              >
                Calculate Delivery Price
              </Button>
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Card title="Calculation Result">
              {!result ? (
                <Alert type="info" showIcon message="Submit the form to calculate a price." />
              ) : (
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Statistic title="Final Delivery Charge" value={result.final_price || 0} precision={2} prefix="NPR" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Packets" value={result.packet_count || 0} />
                    </Col>
                  </Row>

                  <Descriptions
                    bordered
                    size="small"
                    column={1}
                    items={[
                      { key: "pickup", label: "Pickup Branch", children: result.pickup_branch?.name || "—" },
                      { key: "delivery", label: "Delivery Branch", children: result.delivery_branch?.name || "—" },
                      { key: "same", label: "Route Type", children: result.route?.same_branch ? "Same Branch" : "Other Branch" },
                      { key: "base", label: "Route Base Rate", children: money(result.route?.base_rate) },
                      { key: "service", label: "Service", children: result.service_type?.name || result.service_type?.code },
                      { key: "hours", label: "Estimated Hours", children: result.estimated_hours },
                    ]}
                  />

                  <Card size="small" title="Weight Summary">
                    <Descriptions
                      size="small"
                      column={1}
                      items={[
                        { key: "actual", label: "Actual", children: `${result.weight_summary?.total_actual_weight_kg || 0} KG` },
                        { key: "vol", label: "Volumetric", children: `${result.weight_summary?.total_volumetric_weight_kg || 0} KG` },
                        { key: "chargeable", label: "Chargeable", children: `${result.weight_summary?.total_chargeable_weight_kg || 0} KG` },
                        { key: "included", label: "Included", children: `${result.weight_summary?.included_weight_kg || 0} KG` },
                        { key: "excess", label: "Excess", children: `${result.weight_summary?.excess_weight_kg || 0} KG` },
                        { key: "charge", label: "Weight Charge", children: money(result.weight_summary?.total_weight_charge) },
                      ]}
                    />
                  </Card>

                  <Card size="small" title="Charge Breakdown">
                    <Descriptions
                      size="small"
                      column={1}
                      items={[
                        { key: "route", label: "Route Base", children: money(breakdown.route_base_rate?.total) },
                        { key: "weight", label: "Additional Weight", children: money(breakdown.additional_weight?.total) },
                        { key: "fragile", label: "Fragile", children: money(breakdown.fragile?.total) },
                        { key: "distance", label: "Extra Distance", children: money(breakdown.extra_delivery_distance?.total) },
                        { key: "sdd", label: "Same Day", children: money(breakdown.same_day?.total) },
                        { key: "minimum", label: "Low Packet Charge", children: money(breakdown.minimum_packet_charge?.total) },
                        { key: "final", label: "Final", children: <Text strong>{money(result.final_price)}</Text> },
                      ]}
                    />
                  </Card>
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      </Form>

      {result && (
        <Card title="Packet Breakdown" style={{ marginTop: 20 }}>
          <Table
            rowKey="packet_reference"
            columns={packetColumns}
            dataSource={result.packets || []}
            pagination={false}
            scroll={{ x: 1500 }}
          />
        </Card>
      )}

      {result && (
        <Collapse
          style={{ marginTop: 20 }}
          items={[
            {
              key: "json",
              label: "Raw Pricing Engine Response",
              children: (
                <pre style={{ maxHeight: 600, overflow: "auto", background: "#111827", color: "#e5e7eb", padding: 16, borderRadius: 8 }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
