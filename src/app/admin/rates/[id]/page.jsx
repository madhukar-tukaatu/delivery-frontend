"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  FieldTimeOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  PercentageOutlined,
  SettingOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import {
  activatePricingSettings,
  deletePricingSettings,
  getPricingSetting,
} from "@/services/adminPricingConfigurationService";
import { pricingErrorMessage, toBoolean } from "@/lib/pricing-settings-utils";
import PricingCalculationExampleCard from "@/components/admin/rate-admin/PricingCalculationExampleCard";

const { Title, Text, Paragraph } = Typography;

export default function PricingSettingViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getPricingSetting(id);
      setRecord(result);
    } catch (error) {
      message.error(pricingErrorMessage(error, "Could not load the pricing version."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const activate = async () => {
    try {
      setActionLoading(true);
      await activatePricingSettings(id);
      message.success("Pricing version activated.");
      await loadRecord();
    } catch (error) {
      message.error(pricingErrorMessage(error, "Could not activate the pricing version."));
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async () => {
    try {
      setActionLoading(true);
      await deletePricingSettings(id);
      message.success("Pricing version deleted.");
      router.push("/admin/rates");
    } catch (error) {
      message.error(pricingErrorMessage(error, "Could not delete the pricing version."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 450, display: "grid", placeItems: "center" }}>
        <Spin size="large" tip="Loading pricing version details..." />
      </div>
    );
  }

  if (!record) {
    return (
      <Alert
        type="error"
        showIcon
        message="Pricing version not found."
        description="The requested pricing settings version does not exist or has been removed."
        action={
          <Button type="primary" onClick={() => router.push("/admin/rates")}>
            Back to Pricing Settings
          </Button>
        }
      />
    );
  }

  const isActive = toBoolean(record.is_active);
  const expressEnabled = toBoolean(record.express_enabled);
  const sameDayEnabled = toBoolean(record.same_day_enabled);
  const fragileEnabled = toBoolean(record.fragile_enabled);
  const pickupEnabled = toBoolean(record.pickup_charge_enabled);
  const vatEnabled = toBoolean(record.vat_enabled ?? true);
  const vatInclusive = record.vat_inclusive !== undefined ? toBoolean(record.vat_inclusive) : true;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Header Banner */}
      <Card
        bordered={false}
        styles={{ body: { padding: "16px 20px" } }}
        style={{
          background: isActive
            ? "linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)"
            : "#ffffff",
          border: isActive ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space align="center" size={12}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/rates")} />
              <div>
                <Space align="center">
                  <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                    {record.name || `Pricing Version ${record.id}`}
                  </Title>
                  {isActive ? (
                    <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontWeight: "bold" }}>
                      Active Version
                    </Tag>
                  ) : (
                    <Tag color="default">Inactive Version</Tag>
                  )}
                </Space>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
                  Pricing Version ID: <strong>#{record.id}</strong> · Governs global base allowances, excess distance, speed multipliers, and tax.
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Button icon={<EditOutlined />} onClick={() => router.push(`/admin/rates/${record.id}/edit`)}>
                Create New Version from This
              </Button>

              {!isActive ? (
                <Button type="primary" loading={actionLoading} onClick={activate}>
                  Activate Version
                </Button>
              ) : null}

              {!isActive ? (
                <Popconfirm
                  title="Delete this inactive version?"
                  description="This action cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={remove}
                >
                  <Button danger icon={<DeleteOutlined />} loading={actionLoading}>
                    Delete
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Top Quick Highlights KPI Bar */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Included Weight</Text>
            <Text strong style={{ fontSize: 16, color: "#1e293b" }}>{Number(record.base_weight_kg || 1.5).toFixed(2)} kg</Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>No weight surcharge</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Included Distance</Text>
            <Text strong style={{ fontSize: 16, color: "#1e293b" }}>{Number(record.base_distance_km || 5.0).toFixed(2)} km</Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Base coverage radius</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f0f9ff", borderColor: "#bae6fd" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Local Excess Wt</Text>
            <Text strong style={{ fontSize: 16, color: "#0369a1" }}>NPR {Number(record.local_extra_weight_rate || 20).toFixed(2)}/kg</Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Same branch corridor</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f5f3ff", borderColor: "#c7d2fe" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Transfer Excess Wt</Text>
            <Text strong style={{ fontSize: 16, color: "#4338ca" }}>NPR {Number(record.transfer_extra_weight_rate || 30).toFixed(2)}/kg</Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Inter-branch line-haul</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Extra Distance</Text>
            <Text strong style={{ fontSize: 16, color: "#0284c7" }}>NPR {Number(record.extra_distance_rate || 6).toFixed(2)}/km</Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Beyond included radius</Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: vatEnabled ? "#f0fdf4" : "#f8fafc", borderColor: vatEnabled ? "#bbf7d0" : "#e2e8f0" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Tax (VAT)</Text>
            <Text strong style={{ fontSize: 16, color: vatEnabled ? "#15803d" : "#64748b" }}>
              {vatEnabled ? `${Number(record.vat_percentage || 0).toFixed(2)}% ${vatInclusive ? "Inclusive" : "Added"}` : "Disabled (0%)"}
            </Text>
            <Text type="secondary" style={{ fontSize: 10, display: "block" }}>
              {vatEnabled ? "Billed to customer" : "No VAT calculated"}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 4 Core Detailed Rules Cards */}
      <Row gutter={[16, 16]}>
        {/* Card 1: Limits & Weight Rates */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <CarOutlined style={{ color: "#2563eb" }} />
                <Text strong>1. Base Allowances & Excess Rates</Text>
              </Space>
            }
            style={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          >
            <Descriptions bordered column={1} size="small" labelStyle={{ width: "52%", fontWeight: 500 }}>
              <Descriptions.Item label="Included Weight Allowance">
                <Text strong>{Number(record.base_weight_kg || 1.5).toFixed(2)} kg</Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Parcels up to this weight incur zero excess weight surcharge.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Included Destination Distance">
                <Text strong>{Number(record.base_distance_km || 5.0).toFixed(2)} km</Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Delivery radius from destination hub covered by route base rate.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Local Extra Weight Rate">
                <Text strong style={{ color: "#0369a1" }}>
                  NPR {Number(record.local_extra_weight_rate || 20).toFixed(2)} / kg
                </Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Billed per excess kg when pickup & delivery are in the same branch.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Transfer Extra Weight Rate">
                <Text strong style={{ color: "#4338ca" }}>
                  NPR {Number(record.transfer_extra_weight_rate || 30).toFixed(2)} / kg
                </Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Billed per excess kg on cross-branch inter-hub transfer routes.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Additional Distance Rate">
                <Text strong style={{ color: "#0284c7" }}>
                  NPR {Number(record.extra_distance_rate || 6).toFixed(2)} / km
                </Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Billed per km beyond the included destination distance threshold.
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Card 2: Speed Multipliers (Express & Same-Day) */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <ThunderboltOutlined style={{ color: "#7c3aed" }} />
                <Text strong>2. Service Speed Multipliers (Express & Same-Day)</Text>
              </Space>
            }
            style={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          >
            <Descriptions bordered column={1} size="small" labelStyle={{ width: "52%", fontWeight: 500 }}>
              <Descriptions.Item label="Express Delivery Service">
                {expressEnabled ? (
                  <Space wrap size={4}>
                    <Tag color="cyan">Enabled</Tag>
                    <Tag color="blue">Local: x{Number(record.local_express_multiplier || 1.25).toFixed(4)}</Tag>
                    <Tag color="purple">Transfer: x{Number(record.transfer_express_multiplier || 1.5).toFixed(4)}</Tag>
                  </Space>
                ) : (
                  <Tag color="default">Disabled (Standard rate applies)</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                  Applied as a multiplier to base delivery fare for express speed.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Local Same-Day Delivery">
                {sameDayEnabled ? (
                  <Space>
                    <Tag color="purple">
                      Enabled: x{Number(record.local_same_day_multiplier || 1.5).toFixed(4)}
                    </Tag>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      (+{((Number(record.local_same_day_multiplier || 1.5) - 1) * 100).toFixed(0)}% surcharge)
                    </span>
                  </Space>
                ) : (
                  <Tag color="default">Disabled</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Transfer Same-Day Delivery">
                {sameDayEnabled ? (
                  <Space>
                    <Tag color="purple">
                      Enabled: x{Number(record.transfer_same_day_multiplier || 2.0).toFixed(4)}
                    </Tag>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      (+{((Number(record.transfer_same_day_multiplier || 2.0) - 1) * 100).toFixed(0)}% surcharge)
                    </span>
                  </Space>
                ) : (
                  <Tag color="default">Disabled</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Same-Day Order Cutoff Time">
                <Space>
                  <FieldTimeOutlined style={{ color: "#ea580c" }} />
                  <Text strong>{record.same_day_cutoff_time || "12:00:00"}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Orders placed after cutoff time shift delivery window to the next business day.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fragile Handling Surcharge">
                {fragileEnabled ? (
                  <Space>
                    <Tag color="orange">
                      Enabled: x{Number(record.fragile_multiplier || 1.5).toFixed(4)}
                    </Tag>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      (+{((Number(record.fragile_multiplier || 1.5) - 1) * 100).toFixed(0)}% handling fee)
                    </span>
                  </Space>
                ) : (
                  <Tag color="default">Disabled</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Card 3: Pickup & Tax (VAT) */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <ShopOutlined style={{ color: "#ea580c" }} />
                <Text strong>3. First-Mile Pickup & Tax Configuration</Text>
              </Space>
            }
            style={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          >
            <Descriptions bordered column={1} size="small" labelStyle={{ width: "52%", fontWeight: 500 }}>
              <Descriptions.Item label="Small-Pickup Surcharge">
                {pickupEnabled ? (
                  <Text strong style={{ color: "#ea580c" }}>
                    NPR {Number(record.small_pickup_charge || 50).toFixed(2)}
                  </Text>
                ) : (
                  <Tag color="default">Disabled (Always free pickup)</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Applies when merchant schedules pickup with fewer than threshold packets.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Free Pickup Threshold">
                <Text strong>{record.minimum_free_pickup_packets ?? 3} packets or more</Text>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Zero pickup charge when merchant hands over at least this many parcels.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Value Added Tax (VAT)">
                <Space>
                  <Tag color={vatEnabled ? "green" : "default"}>
                    {vatEnabled ? "VAT Calculation Enabled" : "VAT Disabled"}
                  </Tag>
                  <Text strong>{vatEnabled ? `${Number(record.vat_percentage || 0).toFixed(2)}%` : "0.00%"}</Text>
                </Space>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                  {vatEnabled
                    ? (vatInclusive
                        ? `VAT-Inclusive: ${Number(record.vat_percentage || 13).toFixed(2)}% VAT is already included in displayed delivery fares.`
                        : `VAT-Exclusive: ${Number(record.vat_percentage || 13).toFixed(2)}% VAT is added on top of the calculated delivery subtotal.`)
                    : "No VAT is calculated or added to delivery prices. All fares are pure delivery charges."}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Card 4: Precision, Rounding & Audit */}
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            size="small"
            title={
              <Space>
                <SettingOutlined style={{ color: "#475569" }} />
                <Text strong>4. Rounding Rules & Version Audit</Text>
              </Space>
            }
            style={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }}
          >
            <Descriptions bordered column={1} size="small" labelStyle={{ width: "52%", fontWeight: 500 }}>
              <Descriptions.Item label="Weight Rounding">
                <Tag>{record.weight_rounding || "none"}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Applied to chargeable excess weight.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Distance Rounding">
                <Tag>{record.distance_rounding || "none"}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Applied to excess distance kilometers.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Final Currency Rounding">
                <Tag color="blue">{record.money_rounding || "round"}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Rounds final delivery price to integer/nearest currency unit.
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Version History & Timestamps">
                <div style={{ fontSize: 12 }}>
                  <div><strong>Created:</strong> {record.created_at ? new Date(record.created_at).toLocaleString() : "-"}</div>
                  <div><strong>Updated:</strong> {record.updated_at ? new Date(record.updated_at).toLocaleString() : "-"}</div>
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* ======================= INTERACTIVE LIVE EXAMPLE & AUDIT COMPONENT ======================= */}
      <PricingCalculationExampleCard
        pricingSetting={record}
        title="Live Rate Calculation Example: How This Version Computes Delivery Fare"
      />
    </Space>
  );
}
