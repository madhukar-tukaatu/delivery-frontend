"use client";

import {
  Alert,
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  TimePicker,
  Typography,
  message,
} from "antd";

import {
  DeleteOutlined,
  GlobalOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  activateTransferRoutePricingVersion,
  createTransferRoutePricingVersion,
  deleteTransferRoutePricingVersion,
  getTransferRoutePricingSettings,
  useGlobalTransferRoutePricing,
} from "@/services/adminTransferRoutePricingService";

import {
  buildPricingPayload,
  pricingErrorMessage,
  ROUNDING_OPTIONS,
  toBoolean,
  toPricingFormValues,
} from "@/lib/pricing-settings-utils";

const { Text } = Typography;
const fullWidth = { width: "100%" };

function normalizeHistory(history) {
  if (Array.isArray(history)) {
    return history;
  }

  if (Array.isArray(history?.data)) {
    return history.data;
  }

  return [];
}

export default function RoutePricingSettingsDrawer({
  open,
  route,
  onClose,
  onChanged,
}) {
  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const routeId = route?.id;

  const loadData = useCallback(async () => {
    if (!routeId) {
      return;
    }

    try {
      setLoading(true);

      const result =
        await getTransferRoutePricingSettings(
          routeId,
          {
            per_page: 100,
          },
        );

      setData(result);

      const source =
        result?.custom_active ||
        result?.global_active ||
        result?.effective;

      if (source) {
        form.setFieldsValue(
          toPricingFormValues({
            ...source,
            name:
              result?.custom_active?.name ||
              `${route?.route_code || "Route"} Custom Pricing`,
          }),
        );
      }
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not load route pricing settings.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [form, route?.route_code, routeId]);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      form.resetFields();
      setData(null);
    }
  }, [open, form, loadData]);

  const history = useMemo(
    () => normalizeHistory(data?.history),
    [data],
  );

  const save = async (activate) => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      await createTransferRoutePricingVersion(
        routeId,
        buildPricingPayload(values, activate),
      );

      message.success(
        activate
          ? "Route pricing saved and activated."
          : "Inactive route pricing version saved.",
      );

      await loadData();
      await onChanged?.();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        pricingErrorMessage(
          error,
          "Could not save route pricing.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (id) => {
    try {
      setActionId(id);

      await activateTransferRoutePricingVersion(
        routeId,
        id,
      );

      message.success(
        "Route pricing version activated.",
      );

      await loadData();
      await onChanged?.();
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not activate the route pricing version.",
        ),
      );
    } finally {
      setActionId(null);
    }
  };

  const useGlobal = async () => {
    try {
      setSaving(true);

      await useGlobalTransferRoutePricing(routeId);

      message.success(
        "The route now uses global pricing settings.",
      );

      await loadData();
      await onChanged?.();
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not enable global pricing for this route.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteVersion = async (id) => {
    try {
      setActionId(id);

      await deleteTransferRoutePricingVersion(
        routeId,
        id,
      );

      message.success(
        "Inactive route pricing version deleted.",
      );

      await loadData();
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not delete the route pricing version.",
        ),
      );
    } finally {
      setActionId(null);
    }
  };

  const historyColumns = [
    {
      title: "Version",
      dataIndex: "name",
      render: (value, row) => (
        <Space direction="vertical" size={1}>
          <Text strong>
            {value || `Route Pricing ${row.id}`}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ID: {row.id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Weight",
      dataIndex: "transfer_extra_weight_rate",
      render: (value) =>
        `NPR ${Number(value || 0).toFixed(2)}/kg`,
    },
    {
      title: "Per KM",
      dataIndex: "extra_distance_rate",
      render: (value) =>
        `NPR ${Number(value || 0).toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      render: (value) =>
        toBoolean(value) ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag>Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      render: (_, row) =>
        toBoolean(row.is_active) ? (
          <Tag color="green">Current</Tag>
        ) : (
          <Space>
            <Button
              size="small"
              type="primary"
              loading={actionId === row.id}
              onClick={() => activateVersion(row.id)}
            >
              Activate
            </Button>

            <Popconfirm
              title="Delete this inactive version?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteVersion(row.id)}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Drawer
      open={open}
      width={760}
      title={
        <Space direction="vertical" size={1}>
          <Text strong>Route Pricing Rules</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {route?.name || route?.route_code}
          </Text>
        </Space>
      }
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Tag
            color={
              data?.pricing_mode === "custom"
                ? "purple"
                : "blue"
            }
          >
            {data?.pricing_mode === "custom"
              ? "Custom Pricing"
              : "Global Defaults"}
          </Tag>

          {data?.pricing_mode === "custom" ? (
            <Button
              icon={<GlobalOutlined />}
              loading={saving}
              onClick={useGlobal}
            >
              Use Global
            </Button>
          ) : null}
        </Space>
      }
      footer={
        <Row justify="end">
          <Space>
            <Button onClick={onClose}>Close</Button>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => save(false)}
            >
              Save Version
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => save(true)}
            >
              Save & Activate
            </Button>
          </Space>
        </Row>
      }
    >
      {loading ? (
        <div
          style={{
            minHeight: 380,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          size="small"
          requiredMark={false}
        >
          <Alert
            type={
              data?.pricing_mode === "custom"
                ? "success"
                : "info"
            }
            showIcon
            message={
              data?.pricing_mode === "custom"
                ? "This direction uses custom pricing rules."
                : "This direction currently uses the active global pricing version."
            }
            description={
              data?.pricing_mode === "custom"
                ? "Changing Mustang to Kathmandu does not change Kathmandu to Mustang."
                : "The form is prefilled from global settings. Saving creates route-specific rules."
            }
            style={{ marginBottom: 14 }}
          />

          <Row gutter={[12, 0]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Version name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="base_weight_kg"
                label="Included weight"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  addonAfter="kg"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="base_distance_km"
                label="Included distance"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  addonAfter="km"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "4px 0 12px" }} />

          <Row gutter={[12, 0]}>
            <Col span={8}>
              <Form.Item
                name="transfer_extra_weight_rate"
                label="Extra weight"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  addonBefore="NPR"
                  addonAfter="/kg"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="extra_distance_rate"
                label="Extra distance"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  addonBefore="NPR"
                  addonAfter="/km"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="fragile_multiplier"
                label="Fragile multiplier"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  precision={4}
                  addonBefore="x"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 0]}>
            <Col span={8}>
              <Form.Item
                name="transfer_same_day_multiplier"
                label="Same-day multiplier"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  precision={4}
                  addonBefore="x"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="same_day_cutoff_time"
                label="Same-day cutoff"
                rules={[{ required: true }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="small_pickup_charge"
                label="Small-pickup charge"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  addonBefore="NPR"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 0]}>
            <Col span={8}>
              <Form.Item
                name="minimum_free_pickup_packets"
                label="Minimum packets"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  addonAfter="packets"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_percentage"
                label="VAT included"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  max={100}
                  precision={2}
                  addonAfter="%"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="money_rounding"
                label="Money rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 0]}>
            <Col span={8}>
              <Form.Item
                name="weight_rounding"
                label="Weight rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="distance_rounding"
                label="Distance rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Space size="large">
                <Form.Item
                  name="fragile_enabled"
                  label="Fragile"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="same_day_enabled"
                  label="Same day"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name="pickup_charge_enabled"
                  label="Pickup"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Space>
            </Col>
          </Row>

          <Form.Item name="local_extra_weight_rate" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="local_same_day_multiplier" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="vat_enabled" hidden valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider orientation="left">
            Route Pricing History
          </Divider>

          <Table
            rowKey="id"
            size="small"
            columns={historyColumns}
            dataSource={history}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 700 }}
          />
        </Form>
      )}
    </Drawer>
  );
}
