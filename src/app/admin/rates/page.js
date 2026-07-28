"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
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
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  activatePricingSettings,
  deletePricingSettings,
  getPricingSettings,
} from "@/services/adminPricingConfigurationService";

import { pricingErrorMessage, toBoolean } from "@/lib/pricing-settings-utils";

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

      const result = await getPricingSettings({
        page: 1,
        per_page: 100,
      });

      setActive(result?.active ?? null);

      setHistory(
        Array.isArray(result?.history?.data) ? result.history.data : [],
      );
    } catch (error) {
      setActive(null);
      setHistory([]);

      message.error(
        pricingErrorMessage(error, "Could not load pricing settings."),
      );
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
        String(row.name || "")
          .toLowerCase()
          .includes(query) ||
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
      message.error(
        pricingErrorMessage(error, "Could not activate the pricing version."),
      );
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
      message.error(
        pricingErrorMessage(error, "Could not delete the pricing version."),
      );
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    {
      title: "Pricing Version",
      key: "version",
      width: 260,

      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.name || `Pricing Version ${row.id}`}</Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Version ID: {row.id}
          </Text>
        </Space>
      ),
    },

    {
      title: "Included Limits",
      key: "limits",
      width: 190,

      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>{Number(row.base_weight_kg).toFixed(2)} kg</Text>

          <Text>{Number(row.base_distance_km).toFixed(2)} km</Text>
        </Space>
      ),
    },

    {
      title: "Extra Weight",
      key: "weight",
      width: 220,

      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text>
            Local: NPR {Number(row.local_extra_weight_rate).toFixed(2)}
            /kg
          </Text>

          <Text>
            Transfer: NPR {Number(row.transfer_extra_weight_rate).toFixed(2)}
            /kg
          </Text>
        </Space>
      ),
    },

    {
      title: "Per KM",
      dataIndex: "extra_distance_rate",
      width: 130,

      render: (value) => `NPR ${Number(value).toFixed(2)}`,
    },

    {
      title: "Special Rules",
      key: "special",
      width: 240,

      render: (_, row) => (
        <Space wrap size={[4, 4]}>
          {toBoolean(row.fragile_enabled) ? (
            <Tag color="orange">
              Fragile ×{Number(row.fragile_multiplier).toFixed(2)}
            </Tag>
          ) : null}

          {toBoolean(row.same_day_enabled) ? (
            <Tag color="purple">Same Day</Tag>
          ) : null}

          {toBoolean(row.pickup_charge_enabled) ? (
            <Tag color="blue">Pickup Rule</Tag>
          ) : null}

          <Tag color="green">VAT Included</Tag>
        </Space>
      ),
    },

    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,

      render: (value) =>
        toBoolean(value) ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Active
          </Tag>
        ) : (
          <Tag>Inactive</Tag>
        ),
    },

    {
      title: "Created",
      dataIndex: "created_at",
      width: 180,

      render: (value) => (value ? new Date(value).toLocaleString() : "—"),
    },

    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 310,

      render: (_, row) => {
        const isActive = toBoolean(row.is_active);

        return (
          <Space wrap>
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
                okButtonProps={{
                  danger: true,
                }}
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
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Pricing Settings
            </Title>

            <Text type="secondary">
              Manage global delivery pricing rules through controlled pricing
              versions.
            </Text>
          </Col>

          <Col>
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
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card bordered={false}>
            <Statistic
              title="Active Version"
              value={active?.name || "Not configured"}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="Included Weight"
              value={Number(active?.base_weight_kg || 0)}
              precision={2}
              suffix="kg"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="Included Distance"
              value={Number(active?.base_distance_km || 0)}
              precision={2}
              suffix="km"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false}>
            <Statistic
              title="Per KM Charge"
              value={Number(active?.extra_distance_rate || 0)}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false}>
            <Statistic title="Versions" value={history.length} />
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Input
              allowClear
              placeholder="Search version name or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Col>

          <Col xs={24} md={8}>
            <Select
              allowClear
              placeholder="All statuses"
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={[
                {
                  label: "Active",
                  value: true,
                },
                {
                  label: "Inactive",
                  value: false,
                },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          scroll={{ x: 1650 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
          }}
        />
      </Card>
    </Space>
  );
}
