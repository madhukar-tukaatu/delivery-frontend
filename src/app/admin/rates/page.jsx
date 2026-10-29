"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  Popconfirm,
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
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  CarOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  activatePricingSettings,
  deletePricingSettings,
  getPricingSettings,
} from "@/services/admin/adminPricingConfigurationService";
import { pricingErrorMessage, toBoolean } from "@/lib/pricing-settings-utils";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import PricingCalculationExampleCard from "@/components/admin/rate-admin/PricingCalculationExampleCard";

const { Title, Text } = Typography;

export default function PricingSettingsListPage() {
  const router = useRouter();

  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getPricingSettings({ page: 1, per_page: 100 });
      setActive(result?.active ?? null);
      setHistory(Array.isArray(result?.history?.data) ? result.history.data : []);
    } catch (error) {
      setActive(null);
      setHistory([]);
      message.error(pricingErrorMessage(error, "Could not load pricing settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((row) => {
      const matchesSearch =
        !query ||
        String(row.name || "").toLowerCase().includes(query) ||
        String(row.id).includes(query);
      const matchesStatus =
        status === undefined || toBoolean(row.is_active) === status;
      return matchesSearch && matchesStatus;
    });
  }, [history, search, status]);

  const activateVersion = async (row) => {
    try {
      setActionId(row.id);
      await activatePricingSettings(row.id);
      message.success("Pricing version activated.");
      await loadData();
    } catch (error) {
      message.error(pricingErrorMessage(error, "Could not activate the pricing version."));
    } finally {
      setActionId(null);
    }
  };

  const removeVersion = async (row) => {
    try {
      setActionId(row.id);
      await deletePricingSettings(row.id);
      message.success("Inactive pricing version deleted.");
      await loadData();
    } catch (error) {
      message.error(pricingErrorMessage(error, "Could not delete the pricing version."));
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    {
      title: "Pricing Version",
      key: "version",
      width: 250,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Text strong style={{ fontSize: 13 }}>{row.name || `Pricing Version ${row.id}`}</Text>
            {toBoolean(row.is_active) ? (
              <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
            ) : null}
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Version ID: #{row.id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Base Allowances",
      key: "limits",
      width: 170,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>Weight: <strong>{Number(row.base_weight_kg || 1.5).toFixed(2)} kg</strong></Text>
          <Text style={{ fontSize: 12 }}>Radius: <strong>{Number(row.base_distance_km || 5.0).toFixed(2)} km</strong></Text>
        </Space>
      ),
    },
    {
      title: "Excess Weight",
      key: "weight",
      width: 200,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            Local: <strong style={{ color: "#0369a1" }}>NPR {Number(row.local_extra_weight_rate || 20).toFixed(2)}/kg</strong>
          </Text>
          <Text style={{ fontSize: 12 }}>
            Transfer: <strong style={{ color: "#4338ca" }}>NPR {Number(row.transfer_extra_weight_rate || 30).toFixed(2)}/kg</strong>
          </Text>
        </Space>
      ),
    },
    {
      title: "Per KM Rate",
      dataIndex: "extra_distance_rate",
      width: 120,
      render: (v) => (
        <Text strong style={{ color: "#0284c7" }}>
          NPR {Number(v || 6).toFixed(2)}/km
        </Text>
      ),
    },
    {
      title: "Express Speed",
      key: "express",
      width: 170,
      render: (_, row) => {
        const enabled = toBoolean(row.express_enabled);
        if (!enabled) return <Tag color="default">Disabled</Tag>;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 11 }}>Local: <strong>x{Number(row.local_express_multiplier || 1.25).toFixed(2)}</strong></Text>
            <Text style={{ fontSize: 11 }}>Transfer: <strong>x{Number(row.transfer_express_multiplier || 1.5).toFixed(2)}</strong></Text>
          </Space>
        );
      },
    },
    {
      title: "Same Day Speed",
      key: "sameday",
      width: 190,
      render: (_, row) => {
        const enabled = toBoolean(row.same_day_enabled);
        if (!enabled) return <Tag color="default">Disabled</Tag>;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 11 }}>Local: <strong>x{Number(row.local_same_day_multiplier || 1.5).toFixed(2)}</strong> · Transfer: <strong>x{Number(row.transfer_same_day_multiplier || 2.0).toFixed(2)}</strong></Text>
            <Text type="secondary" style={{ fontSize: 10 }}>Cutoff: {row.same_day_cutoff_time || "12:00:00"}</Text>
          </Space>
        );
      },
    },
    {
      title: "Fragile & Pickup",
      key: "special",
      width: 210,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          {toBoolean(row.fragile_enabled) ? (
            <Tag color="orange" style={{ margin: 0 }}>
              Fragile x{Number(row.fragile_multiplier || 1.5).toFixed(2)}
            </Tag>
          ) : (
            <Tag style={{ margin: 0 }}>Fragile Off</Tag>
          )}

          {toBoolean(row.pickup_charge_enabled) ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Pickup NPR {Number(row.small_pickup_charge || 50).toFixed(0)} (&lt;{row.minimum_free_pickup_packets ?? 3} pkts)
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>Free Pickup</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Tax & Rounding",
      key: "tax_rounding",
      width: 170,
      render: (_, row) => {
        const vatEnabled = toBoolean(row.vat_enabled ?? false);
        return (
          <Space direction="vertical" size={0}>
            {vatEnabled ? (
              <Tag color="green" style={{ margin: 0 }}>
                {Number(row.vat_percentage || 13).toFixed(0)}% {toBoolean(row.vat_inclusive ?? true) ? "Inclusive" : "Added"}
              </Tag>
            ) : (
              <Tag color="default" style={{ margin: 0 }}>
                VAT Disabled (0%)
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 11, marginTop: 2 }}>
              Rounding: {row.money_rounding || "round"}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 160,
      render: (v) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {v ? new Date(v).toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 260,
      render: (_, row) => {
        const isActive = toBoolean(row.is_active);
        return (
          <Space wrap size={4}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/admin/rates/${row.id}`)}
            >
              View
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => router.push(`/admin/rates/${row.id}/edit`)}
            >
              New Version
            </Button>
            {!isActive ? (
              <Button
                size="small"
                type="primary"
                loading={actionId === row.id}
                onClick={() => activateVersion(row)}
              >
                Activate
              </Button>
            ) : null}
            {!isActive ? (
              <Popconfirm
                title="Delete this inactive version?"
                description="This action cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => removeVersion(row)}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={actionId === row.id}
                />
              </Popconfirm>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Pricing Settings"
        subtitle="Manage global delivery pricing rules through controlled pricing versions. Governs weight thresholds, distance, multipliers, and tax."
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push("/admin/rates/new")}
            >
              Add Pricing Version
            </Button>
          </Space>
        }
      />

      {/* Top Stat Cards */}
      <StatCardGrid>
        <StatCard
          label="Active Version"
          value={active?.name || "Not configured"}
          variant="primary"
        />
        <StatCard
          label="Included Allowances"
          value={`${Number(active?.base_weight_kg || 1.5).toFixed(2)} kg · ${Number(active?.base_distance_km || 5).toFixed(2)} km`}
          variant="success"
        />
        <StatCard
          label="Excess Rates"
          value={`Wt: NPR ${Number(active?.transfer_extra_weight_rate || 30).toFixed(0)}/kg · Dist: NPR ${Number(active?.extra_distance_rate || 6).toFixed(0)}/km`}
          variant="accent"
        />
        <StatCard
          label="Speed Multipliers"
          value={`Express: x${Number(active?.transfer_express_multiplier || 1.5).toFixed(2)} · Same-Day: x${Number(active?.transfer_same_day_multiplier || 2).toFixed(2)}`}
          variant="warning"
        />
        <StatCard
          label="Total Versions"
          value={history.length}
          variant="primary"
        />
      </StatCardGrid>

      {/* Filter and Search Bar */}
      <Card bordered={false} styles={{ body: { padding: "12px 16px" } }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={16}>
            <Input
              allowClear
              placeholder="Search pricing version by name or ID (e.g. Kathmandu, 5...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              allowClear
              placeholder="Filter by Status (All)"
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={[
                { label: "Active Version Only", value: true },
                { label: "Inactive Versions", value: false },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Table of Pricing Versions with Expandable Rows */}
      <Card
        bordered={false}
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text strong style={{ fontSize: 14 }}>
                  Pricing Settings Versions ({filteredRows.length})
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Click [+] to expand any version for full parameter details & instant calculation example.
                </Text>
              </Space>
            </Col>
          </Row>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          scroll={{ x: 1750 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ margin: "8px 0" }}>
                <PricingCalculationExampleCard
                  pricingSetting={record}
                  title={`Live Rate Calculation Example for ${record.name || `Version #${record.id}`}`}
                />
              </div>
            ),
          }}
        />
      </Card>

      {/* Live Calculation Example for the Active Version */}
      {active ? (
        <PricingCalculationExampleCard
          pricingSetting={active}
          title={`Active Rule Calculation Example: How Current Global Pricing Computes Delivery Fares`}
        />
      ) : null}
    </Space>
  );
}
