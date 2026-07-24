"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons";
import { pricingQuotesApi } from "@/lib/admin-pricing-api";
import {
  formatDateTime,
  money,
  quoteStatusColors,
} from "@/lib/pricing-formatters";

const { Title, Text } = Typography;

export default function PricingQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!params.id) return;
    setLoading(true);
    try {
      const response = await pricingQuotesApi.get(params.id);
      setQuote(response.data || null);
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (loading && !quote) {
    return (
      <div style={{ minHeight: 400, display: "grid", placeItems: "center" }}>
        {contextHolder}
        <Spin size="large" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={{ padding: 24 }}>
        {contextHolder}
        <Alert type="error" showIcon message="Pricing quote could not be loaded." />
      </div>
    );
  }

  const snapshot = quote.snapshot || {};
  const packets = snapshot.packets || [];
  const weight = snapshot.weight_summary || {};
  const breakdown = snapshot.breakdown || {};

  const packetColumns = [
    { title: "Packet", dataIndex: "packet_reference", fixed: "left", width: 120 },
    { title: "Product", dataIndex: "name", width: 180 },
    {
      title: "Type",
      dataIndex: "parcel_type",
      width: 120,
      render: (value) => <Tag color={value === "fragile" ? "volcano" : "blue"}>{value}</Tag>,
    },
    { title: "Actual KG", dataIndex: "actual_weight_kg", width: 100 },
    { title: "Volumetric KG", dataIndex: "volumetric_weight_kg", width: 130, render: (value) => value ?? "—" },
    { title: "Chargeable KG", dataIndex: "chargeable_weight_kg", width: 130 },
    { title: "Base Share", dataIndex: "allocated_base_rate", width: 120, render: (value) => money(value, quote.currency) },
    { title: "Weight Share", dataIndex: "allocated_weight_charge", width: 120, render: (value) => money(value, quote.currency) },
    { title: "Fragile", width: 110, render: (_, row) => money(row.fragile?.total, quote.currency) },
    { title: "Subtotal", dataIndex: "packet_subtotal", width: 130, render: (value) => <Text strong>{money(value, quote.currency)}</Text> },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Space direction="vertical" size={4}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/pricing-quotes")} style={{ padding: 0 }}>
              Back to Pricing Quotes
            </Button>
            <Space align="center">
              <Title level={2} style={{ margin: 0 }}>{quote.quote_number}</Title>
              <Tag color={quoteStatusColors[quote.status] || "blue"}>{String(quote.status).toUpperCase()}</Tag>
            </Space>
            <Text type="secondary">Immutable pricing calculation snapshot</Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card title="Quote Summary">
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, lg: 3 }}
              items={[
                { key: "store", label: "Store ID", children: quote.store_id ?? "—" },
                { key: "merchant", label: "Merchant ID", children: quote.merchant_id ?? "—" },
                { key: "service", label: "Service", children: quote.service_type },
                { key: "payment", label: "Payment", children: String(quote.payment_type || "—").toUpperCase() },
                { key: "pod", label: "POD Amount", children: money(quote.pod_amount, quote.currency) },
                { key: "packets", label: "Packets", children: quote.packet_count },
                { key: "weight", label: "Parcel Weight", children: `${quote.parcel_weight} KG` },
                { key: "value", label: "Parcel Value", children: money(quote.parcel_value, quote.currency) },
                { key: "type", label: "Aggregate Type", children: quote.parcel_type },
                { key: "created", label: "Created", children: formatDateTime(quote.created_at) },
                { key: "expires", label: "Expires", children: formatDateTime(quote.expires_at) },
                { key: "hours", label: "Estimated Hours", children: quote.estimated_hours ?? "—" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card>
            <Statistic title="Final Delivery Price" value={quote.final_price} precision={2} prefix={quote.currency || "NPR"} />
          </Card>
        </Col>
      </Row>

      <Card title="Route and Addresses" style={{ marginTop: 20 }}>
        <Descriptions
          bordered
          size="small"
          column={{ xs: 1, md: 2 }}
          items={[
            { key: "pickup-branch", label: "Pickup Branch", children: snapshot.pickup_branch?.name || "—" },
            { key: "delivery-branch", label: "Delivery Branch", children: snapshot.delivery_branch?.name || "—" },
            { key: "pickup", label: "Pickup Address", children: quote.pickup_address || "—" },
            { key: "delivery", label: "Delivery Address", children: quote.delivery_address || "—" },
            { key: "same", label: "Same Branch", children: snapshot.route?.same_branch ? "Yes" : "No" },
            { key: "base", label: "Base Rate", children: money(snapshot.route?.base_rate, quote.currency) },
          ]}
        />
      </Card>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card title="Weight Summary" style={{ height: "100%" }}>
            <Descriptions
              size="small"
              bordered
              column={1}
              items={[
                { key: "actual", label: "Total Actual", children: `${weight.total_actual_weight_kg || 0} KG` },
                { key: "vol", label: "Total Volumetric", children: `${weight.total_volumetric_weight_kg || 0} KG` },
                { key: "chargeable", label: "Total Chargeable", children: `${weight.total_chargeable_weight_kg || 0} KG` },
                { key: "included", label: "Included", children: `${weight.included_weight_kg || 0} KG` },
                { key: "excess", label: "Excess", children: `${weight.excess_weight_kg || 0} KG` },
                { key: "rate", label: "Rate / KG", children: money(weight.rate_per_kg, quote.currency) },
                { key: "charge", label: "Weight Charge", children: money(weight.total_weight_charge, quote.currency) },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Charge Breakdown" style={{ height: "100%" }}>
            <Descriptions
              size="small"
              bordered
              column={1}
              items={[
                { key: "route", label: "Route Base", children: money(breakdown.route_base_rate?.total, quote.currency) },
                { key: "weight", label: "Additional Weight", children: money(breakdown.additional_weight?.total, quote.currency) },
                { key: "fragile", label: "Fragile", children: money(breakdown.fragile?.total, quote.currency) },
                { key: "distance", label: "Extra Distance", children: money(breakdown.extra_delivery_distance?.total, quote.currency) },
                { key: "same-day", label: "Same Day", children: money(breakdown.same_day?.total, quote.currency) },
                { key: "minimum", label: "Low Packet Charge", children: money(breakdown.minimum_packet_charge?.total, quote.currency) },
                { key: "final", label: "Final", children: <Text strong>{money(breakdown.final_price ?? quote.final_price, quote.currency)}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Packet Breakdown" style={{ marginTop: 20 }}>
        <Table
          rowKey="packet_reference"
          columns={packetColumns}
          dataSource={packets}
          pagination={false}
          scroll={{ x: 1350 }}
          locale={{ emptyText: "No packet details were saved in this quote snapshot." }}
        />
      </Card>

      <Collapse
        style={{ marginTop: 20 }}
        items={[
          {
            key: "snapshot",
            label: "Raw Immutable Snapshot",
            children: (
              <pre style={{ maxHeight: 700, overflow: "auto", background: "#111827", color: "#e5e7eb", padding: 16, borderRadius: 8 }}>
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            ),
          },
        ]}
      />
    </div>
  );
}
