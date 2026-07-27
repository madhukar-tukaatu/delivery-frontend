"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Typography,
  message,
} from "antd";
import {
  CloudDownloadOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  activatePricingSettings,
  createPricingSettingsVersion,
  getPricingReturnRules,
  getPricingSettings,
  importDefaultPricing,
  previewDefaultPricing,
  updatePricingReturnRule,
} from "@/services/adminPricingConfigurationService";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function extractCollection(payload) {
  const candidates = [
    payload,
    payload?.data,
    payload?.data?.data,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (Array.isArray(candidate?.data)) {
      return candidate.data;
    }
  }

  return [];
}

function errorMessage(error, fallback) {
  const validationErrors = error?.response?.data?.errors;

  if (validationErrors) {
    const first = Object.values(validationErrors)
      .flat()
      .find(Boolean);

    if (first) return String(first);
  }

  return error?.response?.data?.message || error?.message || fallback;
}

export default function PricingRulesPage() {
  const [form] = Form.useForm();

  const [settings, setSettings] = useState([]);
  const [returnRules, setReturnRules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const activeSettings = useMemo(
    () => settings.find((row) => Boolean(row.is_active)) || settings[0] || null,
    [settings],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [settingsPayload, rulesPayload] = await Promise.all([
        getPricingSettings({
          per_page: 100,
        }),
        getPricingReturnRules(),
      ]);

      const rows = extractCollection(settingsPayload);

      setSettings(rows);
      setReturnRules(
        Array.isArray(rulesPayload)
          ? rulesPayload
          : rulesPayload?.data || [],
      );

      const active =
        rows.find((row) => Boolean(row.is_active)) ||
        rows[0];

      if (active) {
        form.setFieldsValue({
          ...active,
          same_day_cutoff_time: active.same_day_cutoff_time
            ? dayjs(active.same_day_cutoff_time, "HH:mm")
            : dayjs("12:00", "HH:mm"),
        });
      }
    } catch (error) {
      message.error(
        errorMessage(error, "Could not load pricing configuration."),
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveNewVersion = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        name: values.name?.trim() || "Pricing Rules",
        included_weight_kg: Number(values.included_weight_kg),
        same_branch_excess_weight_rate: Number(
          values.same_branch_excess_weight_rate,
        ),
        transfer_branch_excess_weight_rate: Number(
          values.transfer_branch_excess_weight_rate,
        ),
        included_delivery_distance_km: Number(
          values.included_delivery_distance_km,
        ),
        extra_distance_rate_per_km: Number(
          values.extra_distance_rate_per_km,
        ),
        fragile_multiplier: Number(values.fragile_multiplier),
        same_day_same_branch_multiplier: Number(
          values.same_day_same_branch_multiplier,
        ),
        same_day_transfer_branch_multiplier: Number(
          values.same_day_transfer_branch_multiplier,
        ),
        same_day_cutoff_time:
          values.same_day_cutoff_time?.format("HH:mm") || "12:00",
        minimum_pickup_packet_count: Number(
          values.minimum_pickup_packet_count,
        ),
        low_packet_pickup_charge: Number(
          values.low_packet_pickup_charge,
        ),
        vat_percentage: Number(values.vat_percentage),
        vat_inclusive: Boolean(values.vat_inclusive),
        quote_validity_minutes: Number(
          values.quote_validity_minutes,
        ),
        effective_from:
          values.effective_from || null,
        change_reason:
          values.change_reason?.trim() || null,
        is_active: false,
      };

      setSaving(true);

      const created = await createPricingSettingsVersion(payload);

      message.success(
        "New pricing-settings version saved. Activate it when ready.",
      );

      if (created?.id) {
        setSettings((current) => [
          created,
          ...current,
        ]);
      } else {
        await loadData();
      }
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        errorMessage(error, "Could not save the pricing version."),
      );
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (id) => {
    try {
      setActivating(true);
      await activatePricingSettings(id);

      message.success("Pricing version activated.");
      await loadData();
    } catch (error) {
      message.error(
        errorMessage(error, "Could not activate the pricing version."),
      );
    } finally {
      setActivating(false);
    }
  };

  const openImport = async () => {
    try {
      setImportOpen(true);
      setImportLoading(true);
      setImportResult(null);

      const preview = await previewDefaultPricing();
      setImportPreview(preview);
    } catch (error) {
      message.error(
        errorMessage(error, "Could not preview default pricing."),
      );
    } finally {
      setImportLoading(false);
    }
  };

  const runImport = async () => {
    try {
      setImporting(true);

      const result = await importDefaultPricing({
        activate: true,
        create_direct_routes: true,
      });

      setImportResult(result);

      message.success(
        `Default pricing imported. ${result?.summary?.imported ?? 0} rates imported and ${result?.summary?.skipped ?? 0} skipped.`,
      );

      await loadData();
    } catch (error) {
      message.error(
        errorMessage(error, "Could not import default pricing."),
      );
    } finally {
      setImporting(false);
    }
  };

  const saveReturnRule = async (row) => {
    try {
      const updated = await updatePricingReturnRule(row.id, {
        name: row.name,
        base_rate_percentage: Number(row.base_rate_percentage),
        distance_rate_per_km: Number(row.distance_rate_per_km),
        fixed_charge: Number(row.fixed_charge),
        is_active: Boolean(row.is_active),
      });

      setReturnRules((current) =>
        current.map((item) =>
          Number(item.id) === Number(row.id)
            ? updated
            : item,
        ),
      );

      message.success("Return-pricing rule updated.");
    } catch (error) {
      message.error(
        errorMessage(error, "Could not update return-pricing rule."),
      );
    }
  };

  const updateReturnRuleLocal = (id, field, value) => {
    setReturnRules((current) =>
      current.map((row) =>
        Number(row.id) === Number(id)
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const returnColumns = [
    {
      title: "Scenario",
      dataIndex: "name",
      width: 320,
      render: (value, row) => (
        <Space direction="vertical" size={2}>
          <Input
            value={value}
            onChange={(event) =>
              updateReturnRuleLocal(
                row.id,
                "name",
                event.target.value,
              )
            }
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.scenario_code}
          </Text>
        </Space>
      ),
    },
    {
      title: "Base Rate %",
      dataIndex: "base_rate_percentage",
      width: 160,
      render: (value, row) => (
        <InputNumber
          min={0}
          precision={2}
          value={Number(value)}
          addonAfter="%"
          style={{ width: "100%" }}
          onChange={(next) =>
            updateReturnRuleLocal(
              row.id,
              "base_rate_percentage",
              next,
            )
          }
        />
      ),
    },
    {
      title: "Distance Rate",
      dataIndex: "distance_rate_per_km",
      width: 180,
      render: (value, row) => (
        <InputNumber
          min={0}
          precision={2}
          value={Number(value)}
          addonBefore="NPR"
          addonAfter="/km"
          style={{ width: "100%" }}
          onChange={(next) =>
            updateReturnRuleLocal(
              row.id,
              "distance_rate_per_km",
              next,
            )
          }
        />
      ),
    },
    {
      title: "Fixed Charge",
      dataIndex: "fixed_charge",
      width: 160,
      render: (value, row) => (
        <InputNumber
          min={0}
          precision={2}
          value={Number(value)}
          addonBefore="NPR"
          style={{ width: "100%" }}
          onChange={(next) =>
            updateReturnRuleLocal(
              row.id,
              "fixed_charge",
              next,
            )
          }
        />
      ),
    },
    {
      title: "Active",
      dataIndex: "is_active",
      width: 90,
      render: (value, row) => (
        <Switch
          checked={Boolean(value)}
          onChange={(next) =>
            updateReturnRuleLocal(
              row.id,
              "is_active",
              next,
            )
          }
        />
      ),
    },
    {
      title: "Action",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          onClick={() => saveReturnRule(row)}
        >
          Save
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: 420,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Pricing Rules
            </Title>
            <Text type="secondary">
              Maintain weight, distance, fragile, same-day, pickup-minimum,
              VAT, and return/cancellation charges used by the pricing engine.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
              >
                Refresh
              </Button>

              <Button
                icon={<CloudDownloadOutlined />}
                onClick={openImport}
              >
                Import Kathmandu Defaults
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={saveNewVersion}
              >
                Save New Version
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Active Pricing Version"
              value={activeSettings?.name || "Not configured"}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Included Weight"
              value={Number(activeSettings?.included_weight_kg || 0)}
              precision={3}
              suffix="kg"
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="VAT"
              value={Number(activeSettings?.vat_percentage || 0)}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: "delivery",
            label: "Delivery Pricing Rules",
            children: (
              <Card bordered={false}>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{
                    name: "Pricing Rules",
                    included_weight_kg: 1.5,
                    same_branch_excess_weight_rate: 20,
                    transfer_branch_excess_weight_rate: 30,
                    included_delivery_distance_km: 5,
                    extra_distance_rate_per_km: 6,
                    fragile_multiplier: 1.05,
                    same_day_same_branch_multiplier: 1.5,
                    same_day_transfer_branch_multiplier: 2,
                    same_day_cutoff_time: dayjs("12:00", "HH:mm"),
                    minimum_pickup_packet_count: 3,
                    low_packet_pickup_charge: 50,
                    vat_percentage: 13,
                    vat_inclusive: true,
                    quote_validity_minutes: 30,
                  }}
                >
                  <Title level={5}>Version Details</Title>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="name"
                        label="Version Name"
                        rules={[{ required: true }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        name="change_reason"
                        label="Change Reason"
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Title level={5}>Base Limits and Weight</Title>

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="included_weight_kg"
                        label="Included Weight"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={3}
                          addonAfter="kg"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="same_branch_excess_weight_rate"
                        label="Same-Branch Extra Weight Rate"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          addonBefore="NPR"
                          addonAfter="/kg"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="transfer_branch_excess_weight_rate"
                        label="Transfer-Branch Extra Weight Rate"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          addonBefore="NPR"
                          addonAfter="/kg"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Title level={5}>Distance and Fragile Handling</Title>

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="included_delivery_distance_km"
                        label="Included Destination Distance"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          addonAfter="km"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="extra_distance_rate_per_km"
                        label="Extra Distance Rate"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          addonBefore="NPR"
                          addonAfter="/km"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="fragile_multiplier"
                        label="Fragile Multiplier"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          precision={4}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Title level={5}>Same-Day Delivery</Title>

                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="same_day_same_branch_multiplier"
                        label="Same-Branch Multiplier"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          precision={4}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="same_day_transfer_branch_multiplier"
                        label="Transfer-Branch Multiplier"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          precision={4}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="same_day_cutoff_time"
                        label="Booking Cutoff"
                        rules={[{ required: true }]}
                      >
                        <TimePicker
                          format="HH:mm"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider />

                  <Title level={5}>Pickup Minimum and VAT</Title>

                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item
                        name="minimum_pickup_packet_count"
                        label="Minimum Packet Count"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item
                        name="low_packet_pickup_charge"
                        label="Low-Packet Charge"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          addonBefore="NPR"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={5}>
                      <Form.Item
                        name="vat_percentage"
                        label="VAT"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={0}
                          precision={4}
                          addonAfter="%"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={12} md={3}>
                      <Form.Item
                        name="vat_inclusive"
                        label="VAT Inclusive"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>

                    <Col xs={12} md={4}>
                      <Form.Item
                        name="quote_validity_minutes"
                        label="Quote Validity"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          addonAfter="minutes"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            ),
          },
          {
            key: "returns",
            label: "Return & Cancellation Rules",
            children: (
              <Card bordered={false}>
                <Alert
                  type="info"
                  showIcon
                  message="These rules are used by the return or cancellation workflow, not by a normal delivery quote."
                  style={{ marginBottom: 16 }}
                />

                <Table
                  rowKey="id"
                  columns={returnColumns}
                  dataSource={returnRules}
                  pagination={false}
                  scroll={{ x: 1050 }}
                />
              </Card>
            ),
          },
          {
            key: "versions",
            label: "Pricing Versions",
            children: (
              <Card bordered={false}>
                <Table
                  rowKey="id"
                  dataSource={settings}
                  pagination={false}
                  columns={[
                    {
                      title: "Version",
                      dataIndex: "name",
                    },
                    {
                      title: "Effective From",
                      dataIndex: "effective_from",
                      render: (value) =>
                        value ? new Date(value).toLocaleString() : "—",
                    },
                    {
                      title: "Status",
                      dataIndex: "is_active",
                      render: (value) =>
                        value ? (
                          <Tag color="green">Active</Tag>
                        ) : (
                          <Tag>Inactive</Tag>
                        ),
                    },
                    {
                      title: "Reason",
                      dataIndex: "change_reason",
                      render: (value) => value || "—",
                    },
                    {
                      title: "Action",
                      render: (_, row) =>
                        row.is_active ? (
                          <Tag color="green">Current</Tag>
                        ) : (
                          <Button
                            size="small"
                            loading={activating}
                            onClick={() => activateVersion(row.id)}
                          >
                            Activate
                          </Button>
                        ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={importOpen}
        title="Import Kathmandu Default Pricing"
        width={940}
        okText={importResult ? "Imported" : "Import and Activate"}
        okButtonProps={{
          disabled: Boolean(importResult),
        }}
        confirmLoading={importing}
        onOk={runImport}
        onCancel={() => {
          setImportOpen(false);
          setImportPreview(null);
          setImportResult(null);
        }}
        destroyOnClose
      >
        {importLoading ? (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Spin />
          </div>
        ) : importPreview ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              type="warning"
              showIcon
              message="The importer updates existing configured routes and creates a route only when a direct active lane exists."
              description="It will not guess or invent a missing multi-stop route. Those rates are reported as skipped until the route path is configured."
            />

            <Descriptions bordered size="small" column={3}>
              <Descriptions.Item label="Preset">
                {importPreview.preset_name}
              </Descriptions.Item>
              <Descriptions.Item label="Included Weight">
                {importPreview.settings?.included_weight_kg} kg
              </Descriptions.Item>
              <Descriptions.Item label="VAT">
                {importPreview.settings?.vat_percentage}%
              </Descriptions.Item>
            </Descriptions>

            <Table
              rowKey={(row) =>
                `${row.destination_branch?.id || "missing"}-${row.base_rate}`
              }
              size="small"
              pagination={false}
              scroll={{ y: 360 }}
              dataSource={importPreview.route_rates || []}
              columns={[
                {
                  title: "Destination",
                  render: (_, row) =>
                    row.destination_branch?.name ||
                    row.destination_aliases?.[0] ||
                    "Not matched",
                },
                {
                  title: "Base Rate",
                  dataIndex: "base_rate",
                  render: (value) => `NPR ${Number(value).toFixed(2)}`,
                },
                {
                  title: "Import Action",
                  dataIndex: "action",
                  render: (value) => {
                    const skipped = String(value).startsWith("skip") ||
                      String(value).includes("missing");

                    return (
                      <Tag color={skipped ? "orange" : "green"}>
                        {value}
                      </Tag>
                    );
                  },
                },
              ]}
            />

            {importResult ? (
              <Alert
                type="success"
                showIcon
                message="Default pricing import completed."
                description={`${importResult.summary?.imported ?? 0} rate entries imported; ${importResult.summary?.skipped ?? 0} skipped.`}
              />
            ) : null}
          </Space>
        ) : (
          <Paragraph>No preview data is available.</Paragraph>
        )}
      </Modal>
    </Space>
  );
}
