"use client";

import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  TimePicker,
  Typography,
} from "antd";

import {
  ArrowLeftOutlined,
  CloudDownloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import {
  ROUNDING_OPTIONS,
} from "@/lib/pricing-settings-utils";

const { Text } = Typography;

const fullWidth = { width: "100%" };

const compactCardStyles = {
  body: { padding: 16 },
  header: { minHeight: 44, paddingInline: 16 },
};

function SectionTitle({ title, description }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Text strong>{title}</Text>
      {description ? (
        <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
          {description}
        </Text>
      ) : null}
    </div>
  );
}

export default function PricingSettingsForm({
  form,
  initialValues,
  title = "Pricing Settings",
  subtitle,
  saving = false,
  loadingDefaults = false,
  onLoadDefaults,
  onCancel,
  onSave,
}) {
  return (
    <Form
      form={form}
      layout="vertical"
      size="small"
      initialValues={initialValues}
      requiredMark={false}
      autoComplete="off"
    >
      <Card bordered={false} styles={compactCardStyles}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={onCancel} />
              <div>
                <Text strong style={{ display: "block", fontSize: 18 }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {subtitle}
                  </Text>
                ) : null}
              </div>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              {onLoadDefaults ? (
                <Button
                  icon={<CloudDownloadOutlined />}
                  loading={loadingDefaults}
                  onClick={onLoadDefaults}
                >
                  Load Defaults
                </Button>
              ) : null}
              <Button icon={<SaveOutlined />} loading={saving} onClick={() => onSave(false)}>
                Save Version
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => onSave(true)}>
                Save & Activate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Alert
        type="info"
        showIcon
        message="These rules are applied after the route base rate is resolved."
        description="The base rate comes from Branch Pricing. Express and Same Day prices are computed by multiplying that base rate by the multipliers below."
        style={{ marginTop: 12, marginBottom: 12 }}
      />

      <Card bordered={false} styles={compactCardStyles}>
        {/* VERSION + LIMITS */}
        <Row gutter={[12, 0]}>
          <Col xs={24} lg={8}>
            <Form.Item
              name="name"
              label="Version name"
              rules={[{ required: true, message: "Enter a version name." }]}
            >
              <Input placeholder="August 2026 Pricing" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Form.Item name="base_weight_kg" label="Included weight" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonAfter="kg" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Form.Item name="base_distance_km" label="Included distance" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonAfter="km" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Form.Item name="vat_percentage" label="VAT included" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} precision={2} addonAfter="%" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Form.Item name="vat_enabled" label="VAT calculation" valuePropName="checked">
              <Switch checkedChildren="On" unCheckedChildren="Off" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "6px 0 14px" }} />

        {/* WEIGHT + DISTANCE */}
        <SectionTitle
          title="Weight and distance charges"
          description="Charges applied after the included weight and distance."
        />
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="local_extra_weight_rate" label="Local extra weight" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonBefore="NPR" addonAfter="/kg" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="transfer_extra_weight_rate" label="Transfer extra weight" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonBefore="NPR" addonAfter="/kg" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="extra_distance_rate" label="Extra distance" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonBefore="NPR" addonAfter="/km" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item
              name="fragile_multiplier"
              label="Fragile multiplier"
              rules={[{ required: true }, { type: "number", min: 1 }]}
            >
              <InputNumber min={1} precision={4} addonBefore="×" style={fullWidth} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "6px 0 14px" }} />

        {/* EXPRESS */}
        <SectionTitle
          title="Express multipliers"
          description="Applied to the base rate when service type is Express. Express price = base rate × multiplier."
        />
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="local_express_multiplier" label="Local express" rules={[{ required: true }, { type: "number", min: 1 }]}>
              <InputNumber min={1} precision={4} addonBefore="×" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="transfer_express_multiplier" label="Transfer express" rules={[{ required: true }, { type: "number", min: 1 }]}>
              <InputNumber min={1} precision={4} addonBefore="×" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Form.Item name="express_enabled" label="Express" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "6px 0 14px" }} />

        {/* SAME DAY + PICKUP */}
        <SectionTitle
          title="Same-day multipliers and pickup charges"
          description="Applied to the base rate when service type is Same Day. Same Day price = base rate × multiplier."
        />
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} lg={5}>
            <Form.Item name="local_same_day_multiplier" label="Local same day" rules={[{ required: true }]}>
              <InputNumber min={1} precision={4} addonBefore="×" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Form.Item name="transfer_same_day_multiplier" label="Transfer same day" rules={[{ required: true }]}>
              <InputNumber min={1} precision={4} addonBefore="×" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Form.Item name="same_day_cutoff_time" label="Cutoff" rules={[{ required: true }]}>
              <TimePicker format="HH:mm" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Form.Item name="minimum_free_pickup_packets" label="Minimum packets" rules={[{ required: true }]}>
              <InputNumber min={1} addonAfter="packets" style={fullWidth} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Form.Item name="small_pickup_charge" label="Small-pickup charge" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} addonBefore="NPR" style={fullWidth} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "6px 0 14px" }} />

        {/* ROUNDING + TOGGLES */}
        <SectionTitle title="Rounding and enabled rules" />
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={8} lg={4}>
            <Form.Item name="weight_rounding" label="Weight rounding" rules={[{ required: true }]}>
              <Select options={ROUNDING_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Form.Item name="distance_rounding" label="Distance rounding" rules={[{ required: true }]}>
              <Select options={ROUNDING_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8} lg={4}>
            <Form.Item name="money_rounding" label="Money rounding" rules={[{ required: true }]}>
              <Select options={ROUNDING_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Form.Item name="fragile_enabled" label="Fragile" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Form.Item name="same_day_enabled" label="Same day" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Form.Item name="pickup_charge_enabled" label="Pickup rule" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Form.Item name="vat_enabled" label="VAT" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} styles={compactCardStyles} style={{ marginTop: 12 }}>
        <Row justify="end">
          <Col>
            <Space>
              <Button onClick={onCancel}>Cancel</Button>
              <Button icon={<SaveOutlined />} loading={saving} onClick={() => onSave(false)}>
                Save Version
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => onSave(true)}>
                Save & Activate
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </Form>
  );
}
