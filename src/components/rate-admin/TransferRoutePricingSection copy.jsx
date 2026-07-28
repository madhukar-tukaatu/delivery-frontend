"use client";

import {
  Alert,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import {
  GlobalOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import {
  ROUTE_ROUNDING_OPTIONS,
  toRouteCustomPricingForm,
} from "@/lib/route-pricing-profile-utils";

const { Text } = Typography;

const fullWidth = {
  width: "100%",
};

function money(value) {
  return Number(value || 0).toFixed(2);
}

export default function TransferRoutePricingSection({
  form,
  route,
  globalPricing,
}) {
  const pricingMode = Form.useWatch("pricing_mode", form) || "global";

  const handleModeChange = (event) => {
    const mode = event.target.value;

    if (mode !== "custom") {
      return;
    }

    const currentCustom = form.getFieldValue("custom_pricing");

    if (currentCustom?.name) {
      return;
    }

    form.setFieldValue(
      "custom_pricing",
      toRouteCustomPricingForm(globalPricing, route),
    );
  };

  return (
    <>
      <Divider
        orientation="left"
        style={{
          marginTop: 14,
          marginBottom: 12,
        }}
      >
        Route Pricing Rules
      </Divider>

      <Form.Item
        name="pricing_mode"
        label="Pricing Mode"
        initialValue="global"
        rules={[{ required: true }]}
      >
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          onChange={handleModeChange}
        >
          <Radio.Button value="global">
            <GlobalOutlined /> Use Global Pricing
          </Radio.Button>

          <Radio.Button value="custom">
            <SettingOutlined /> Add Custom Pricing
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      {pricingMode !== "custom" ? (
        <Alert
          type="info"
          showIcon
          message="This route uses the active global pricing settings."
          description={
            globalPricing ? (
              <Descriptions
                size="small"
                column={{
                  xs: 1,
                  sm: 2,
                  lg: 4,
                }}
                style={{ marginTop: 10 }}
              >
                <Descriptions.Item label="Included Weight">
                  {Number(
                    globalPricing.base_weight_kg ??
                      globalPricing.included_weight_kg ??
                      0,
                  ).toFixed(2)}{" "}
                  kg
                </Descriptions.Item>

                <Descriptions.Item label="Extra Weight">
                  NPR {money(
                    globalPricing.transfer_extra_weight_rate ??
                      globalPricing.transfer_branch_excess_weight_rate ??
                      globalPricing.other_branch_weight_rate,
                  )}
                  /kg
                </Descriptions.Item>

                <Descriptions.Item label="Included Distance">
                  {Number(
                    globalPricing.base_distance_km ??
                      globalPricing.included_delivery_distance_km ??
                      0,
                  ).toFixed(2)}{" "}
                  km
                </Descriptions.Item>

                <Descriptions.Item label="Extra Distance">
                  NPR {money(
                    globalPricing.extra_distance_rate ??
                      globalPricing.extra_distance_rate_per_km,
                  )}
                  /km
                </Descriptions.Item>

                <Descriptions.Item label="Fragile">
                  ×
                  {Number(
                    globalPricing.fragile_multiplier || 1,
                  ).toFixed(4)}
                </Descriptions.Item>

                <Descriptions.Item label="Same Day">
                  ×
                  {Number(
                    globalPricing.transfer_same_day_multiplier ??
                      globalPricing.same_day_transfer_branch_multiplier ??
                      globalPricing.other_branch_sdd_multiplier ??
                      1,
                  ).toFixed(4)}
                </Descriptions.Item>

                <Descriptions.Item label="Pickup Charge">
                  NPR {money(
                    globalPricing.small_pickup_charge ??
                      globalPricing.low_packet_pickup_charge,
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="VAT">
                  {money(globalPricing.vat_percentage)}% included
                </Descriptions.Item>
              </Descriptions>
            ) : (
              "No active global pricing version was found."
            )
          }
        />
      ) : (
        <div
          style={{
            padding: 14,
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
          }}
        >
          <Alert
            type="warning"
            showIcon
            message="These values apply only to this exact route direction."
            description="The complete route base rate remains above. These fields override the active global weight, distance, fragile, same-day and pickup rules."
            style={{ marginBottom: 14 }}
          />

          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name={["custom_pricing", "name"]}
                label="Custom Pricing Name"
                rules={[
                  {
                    required: true,
                    message: "Enter a custom pricing name.",
                  },
                ]}
              >
                <Input placeholder="PKR to BRT Custom Pricing" />
              </Form.Item>
            </Col>

            <Col xs={12} md={6}>
              <Form.Item
                name={["custom_pricing", "base_weight_kg"]}
                label="Included Weight"
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

            <Col xs={12} md={6}>
              <Form.Item
                name={["custom_pricing", "base_distance_km"]}
                label="Included Distance"
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

          <Row gutter={[12, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                name={[
                  "custom_pricing",
                  "transfer_extra_weight_rate",
                ]}
                label="Extra Weight"
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

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "extra_distance_rate"]}
                label="Extra Distance"
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

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "fragile_multiplier"]}
                label="Fragile Multiplier"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  precision={4}
                  addonBefore="×"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[12, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                name={[
                  "custom_pricing",
                  "transfer_same_day_multiplier",
                ]}
                label="Same-Day Multiplier"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  precision={4}
                  addonBefore="×"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "same_day_cutoff_time"]}
                label="Same-Day Cutoff"
                rules={[{ required: true }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "vat_percentage"]}
                label="VAT Included"
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
          </Row>

          <Row gutter={[12, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name={[
                  "custom_pricing",
                  "minimum_free_pickup_packets",
                ]}
                label="Minimum Pickup Packets"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={1}
                  addonAfter="packets"
                  style={fullWidth}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name={["custom_pricing", "small_pickup_charge"]}
                label="Low-Packet Pickup Charge"
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
            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "weight_rounding"]}
                label="Weight Rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUTE_ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "distance_rounding"]}
                label="Distance Rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUTE_ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={["custom_pricing", "money_rounding"]}
                label="Final Price Rounding"
                rules={[{ required: true }]}
              >
                <Select options={ROUTE_ROUNDING_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Space size="large" wrap>
            <Form.Item
              name={["custom_pricing", "fragile_enabled"]}
              label="Fragile Rule"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={["custom_pricing", "same_day_enabled"]}
              label="Same-Day Rule"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={[
                "custom_pricing",
                "pickup_charge_enabled",
              ]}
              label="Pickup Rule"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name={["custom_pricing", "vat_enabled"]}
              label="VAT Calculation"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Tag color="green">VAT is always inclusive</Tag>
          </Space>
        </div>
      )}
    </>
  );
}
