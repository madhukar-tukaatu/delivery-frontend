"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  activatePricingSettings,
  deletePricingSettings,
  getPricingSetting,
} from "@/services/adminPricingConfigurationService";

import {
  pricingErrorMessage,
  toBoolean,
} from "@/lib/pricing-settings-utils";

const { Title, Text } = Typography;

export default function PricingSettingViewPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id;

  const [record, setRecord] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);

      const result =
        await getPricingSetting(id);

      setRecord(result);
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not load the pricing version.",
        ),
      );
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

      message.success(
        "Pricing version activated.",
      );

      await loadRecord();
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not activate the pricing version.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const remove = async () => {
    try {
      setActionLoading(true);

      await deletePricingSettings(id);

      message.success(
        "Pricing version deleted.",
      );

      router.push("/admin/rates");
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not delete the pricing version.",
        ),
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: 450,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!record) {
    return (
      <Alert
        type="error"
        showIcon
        message="Pricing version not found."
      />
    );
  }

  const isActive =
    toBoolean(record.is_active);

  return (
    <Space
      direction="vertical"
      size={20}
      style={{ width: "100%" }}
    >
      <Card bordered={false}>
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() =>
                  router.push("/admin/rates")
                }
              />

              <div>
                <Title
                  level={3}
                  style={{ margin: 0 }}
                >
                  {record.name ||
                    `Pricing Version ${record.id}`}
                </Title>

                <Text type="secondary">
                  Pricing version ID: {record.id}
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  router.push(
                    `/admin/rates/${record.id}/edit`,
                  )
                }
              >
                Create New Version
              </Button>

              {!isActive ? (
                <Button
                  type="primary"
                  loading={actionLoading}
                  onClick={activate}
                >
                  Activate
                </Button>
              ) : (
                <Tag
                  color="green"
                  icon={<CheckCircleOutlined />}
                >
                  Active Version
                </Tag>
              )}

              {!isActive ? (
                <Popconfirm
                  title="Delete this inactive version?"
                  okText="Delete"
                  okButtonProps={{
                    danger: true,
                  }}
                  onConfirm={remove}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={actionLoading}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      <Alert
        type="success"
        showIcon
        message="VAT-inclusive pricing"
        description={`${Number(
          record.vat_percentage,
        ).toFixed(
          2,
        )}% VAT is already included in calculated delivery prices.`}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            bordered={false}
            title="Included Limits and Weight"
          >
            <Descriptions
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Included Weight">
                {Number(
                  record.base_weight_kg,
                ).toFixed(2)}{" "}
                kg
              </Descriptions.Item>

              <Descriptions.Item label="Included Destination Distance">
                {Number(
                  record.base_distance_km,
                ).toFixed(2)}{" "}
                km
              </Descriptions.Item>

              <Descriptions.Item label="Local Extra Weight">
                NPR{" "}
                {Number(
                  record.local_extra_weight_rate,
                ).toFixed(2)}
                /kg
              </Descriptions.Item>

              <Descriptions.Item label="Transfer Extra Weight">
                NPR{" "}
                {Number(
                  record.transfer_extra_weight_rate,
                ).toFixed(2)}
                /kg
              </Descriptions.Item>

              <Descriptions.Item label="Additional Distance">
                NPR{" "}
                {Number(
                  record.extra_distance_rate,
                ).toFixed(2)}
                /km
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            bordered={false}
            title="Special Pricing Rules"
          >
            <Descriptions
              bordered
              column={1}
              size="small"
            >
              <Descriptions.Item label="Fragile Rule">
                {toBoolean(
                  record.fragile_enabled,
                )
                  ? `Enabled × ${Number(
                      record.fragile_multiplier,
                    ).toFixed(4)}`
                  : "Disabled"}
              </Descriptions.Item>

              <Descriptions.Item label="Local Same Day">
                {toBoolean(
                  record.same_day_enabled,
                )
                  ? `× ${Number(
                      record.local_same_day_multiplier,
                    ).toFixed(4)}`
                  : "Disabled"}
              </Descriptions.Item>

              <Descriptions.Item label="Transfer Same Day">
                {toBoolean(
                  record.same_day_enabled,
                )
                  ? `× ${Number(
                      record.transfer_same_day_multiplier,
                    ).toFixed(4)}`
                  : "Disabled"}
              </Descriptions.Item>

              <Descriptions.Item label="Same-Day Cutoff">
                {record.same_day_cutoff_time}
              </Descriptions.Item>

              <Descriptions.Item label="Small Pickup">
                {toBoolean(
                  record.pickup_charge_enabled,
                )
                  ? `NPR ${Number(
                      record.small_pickup_charge,
                    ).toFixed(
                      2,
                    )} below ${record.minimum_free_pickup_packets} packets`
                  : "Disabled"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        title="Rounding and Audit Information"
      >
        <Descriptions
          bordered
          column={{
            xs: 1,
            md: 2,
            xl: 3,
          }}
          size="small"
        >
          <Descriptions.Item label="Weight Rounding">
            {record.weight_rounding}
          </Descriptions.Item>

          <Descriptions.Item label="Distance Rounding">
            {record.distance_rounding}
          </Descriptions.Item>

          <Descriptions.Item label="Money Rounding">
            {record.money_rounding}
          </Descriptions.Item>

          <Descriptions.Item label="Created">
            {record.created_at
              ? new Date(
                  record.created_at,
                ).toLocaleString()
              : "—"}
          </Descriptions.Item>

          <Descriptions.Item label="Updated">
            {record.updated_at
              ? new Date(
                  record.updated_at,
                ).toLocaleString()
              : "—"}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            {isActive ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag>Inactive</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );
}