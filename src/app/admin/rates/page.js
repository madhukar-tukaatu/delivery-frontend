"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { pricingSettingsApi } from "@/lib/admin-pricing-api";
import { formatDateTime, money } from "@/lib/pricing-formatters";
import PricingSettingsDrawer from "./components/PricingSettingsDrawer";

const { Title, Text } = Typography;

export default function PricingSettingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [active, setActive] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawer, setDrawer] = useState({
    open: false,
    mode: "create",
    record: null,
  });

  const load = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const response = await pricingSettingsApi.list({
          page,
          per_page: pageSize,
        });

        const history = response.data?.history || {};
        setActive(response.data?.active || null);
        setRows(history.data || []);
        setPagination({
          current: history.current_page || page,
          pageSize: history.per_page || pageSize,
          total: history.total || 0,
        });
      } catch (error) {
        messageApi.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [messageApi, pagination.current, pagination.pageSize],
  );

  useEffect(() => {
    load(1, 20);
  }, []);

  const activeItems = useMemo(() => {
    if (!active) return [];

    return [
      { key: "weight", label: "Included Weight", children: `${active.included_weight_kg} KG` },
      { key: "same-rate", label: "Same Branch / KG", children: money(active.same_branch_weight_rate) },
      { key: "other-rate", label: "Other Branch / KG", children: money(active.other_branch_weight_rate) },
      { key: "divisor", label: "Volumetric Divisor", children: active.volumetric_divisor },
      { key: "fragile", label: "Fragile Multiplier", children: active.fragile_multiplier },
      { key: "distance", label: "Included Distance", children: `${active.included_delivery_distance_km} KM` },
      { key: "distance-rate", label: "Extra Distance / KM", children: money(active.extra_distance_rate_per_km) },
      { key: "same-day", label: "Same-Day Multipliers", children: `${active.same_branch_sdd_multiplier} / ${active.other_branch_sdd_multiplier}` },
      { key: "cutoff", label: "Same-Day Cutoff", children: String(active.same_day_cutoff_time || "—") },
      { key: "packets", label: "Minimum Packets", children: active.minimum_pickup_packets },
      { key: "packet-charge", label: "Low-Packet Charge", children: money(active.low_packet_pickup_charge) },
      { key: "validity", label: "Quote Validity", children: `${active.quote_validity_minutes || 30} minutes` },
      { key: "vat", label: "VAT", children: `${active.vat_percentage}% ${active.vat_inclusive ? "inclusive" : "exclusive"}` },
    ];
  }, [active]);

  async function save(values) {
    setSaving(true);
    try {
      const response = drawer.mode === "edit" && drawer.record
        ? await pricingSettingsApi.update(drawer.record.id, values)
        : await pricingSettingsApi.create(values);

      messageApi.success(response.message || "Pricing settings saved.");
      setDrawer({ open: false, mode: "create", record: null });
      await load(1, pagination.pageSize);
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function activate(record) {
    try {
      const response = await pricingSettingsApi.activate(record.id);
      messageApi.success(response.message || "Pricing version activated.");
      await load(pagination.current, pagination.pageSize);
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  async function remove(record) {
    try {
      const response = await pricingSettingsApi.remove(record.id);
      messageApi.success(response.message || "Pricing version deleted.");
      await load(pagination.current, pagination.pageSize);
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  const columns = [
    {
      title: "Version",
      dataIndex: "id",
      width: 90,
      render: (id) => `#${id}`,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: (value) => (
        <Tag color={value ? "green" : "default"}>{value ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Included Weight",
      dataIndex: "included_weight_kg",
      render: (value) => `${value} KG`,
    },
    {
      title: "Weight Rates",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>Same: {money(record.same_branch_weight_rate)}</Text>
          <Text type="secondary">Other: {money(record.other_branch_weight_rate)}</Text>
        </Space>
      ),
    },
    {
      title: "Fragile",
      dataIndex: "fragile_multiplier",
      render: (value) => `× ${value}`,
    },
    {
      title: "Distance",
      render: (_, record) => `${record.included_delivery_distance_km} KM + ${money(record.extra_distance_rate_per_km)}/KM`,
    },
    {
      title: "Reason",
      dataIndex: "change_reason",
      ellipsis: true,
      width: 240,
      render: (value) => value || "—",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 180,
      render: formatDateTime,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 220,
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setDrawer({ open: true, mode: "edit", record })}
          >
            New Version
          </Button>
          {!record.is_active && (
            <Popconfirm
              title="Activate this pricing version?"
              description="The currently active version will be deactivated."
              onConfirm={() => activate(record)}
            >
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>
                Activate
              </Button>
            </Popconfirm>
          )}
          {!record.is_active && (
            <Popconfirm
              title="Delete inactive version?"
              onConfirm={() => remove(record)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Pricing Settings</Title>
          <Text type="secondary">Manage versioned rules used by the pricing engine.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setDrawer({ open: true, mode: "create", record: active })}
            >
              Create Version
            </Button>
          </Space>
        </Col>
      </Row>

      {!active ? (
        <Alert
          type="warning"
          showIcon
          message="No active pricing configuration"
          description="Create and activate a pricing version before accepting store pricing requests."
          style={{ marginBottom: 20 }}
        />
      ) : (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              Active Configuration #{active.id}
            </Space>
          }
          extra={<Tag color="green">ACTIVE</Tag>}
          style={{ marginBottom: 20 }}
        >
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, lg: 4 }} items={activeItems} />
        </Card>
      )}

      <Card title={<Space><HistoryOutlined /> Version History</Space>}>
        {rows.length === 0 && !loading ? (
          <Empty description="No pricing versions found." />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 1450 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} versions`,
              onChange: (page, pageSize) => load(page, pageSize),
            }}
          />
        )}
      </Card>

      <PricingSettingsDrawer
        open={drawer.open}
        mode={drawer.mode}
        record={drawer.record}
        saving={saving}
        onClose={() => setDrawer({ open: false, mode: "create", record: null })}
        onSubmit={save}
      />
    </div>
  );
}
