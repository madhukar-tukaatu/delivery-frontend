"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  previewRoute,
  createBranchPricing,
  updateBranchPricing,
  buildServiceTypesPayload,
  extractFormData,
} from "@/services/branchPricingRouteService";
import { getBranches } from "@/services/adminBranchService";

const { Text, Title } = Typography;

/**
 * Branch Pricing Form Component
 * Create/Edit pricing with service type toggles and automatic route details
 */
export default function BranchPricingForm({ pricingData, onSuccess, loading }) {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [routeDetails, setRouteDetails] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, []);

  // Load pricing data for edit mode
  useEffect(() => {
    if (pricingData?.pickup_branch_id) {
      const formData = extractFormData(pricingData);
      form.setFieldsValue(formData);
      loadRoutePreview(
        pricingData.pickup_branch_id,
        pricingData.delivery_branch_id
      );
    }
  }, [pricingData, form]);

  async function loadBranches() {
    try {
      const response = await getBranches({ per_page: 1000 });
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      setBranches(list);
    } catch (error) {
      message.error("Could not load branches");
    }
  }

  async function loadRoutePreview(pickupId, deliveryId) {
    try {
      setPreviewLoading(true);
      const data = await previewRoute(pickupId, deliveryId);
      setRouteDetails(data);
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load route");
      setRouteDetails(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleBranchChange() {
    const pickupId = form.getFieldValue("pickup_branch_id");
    const deliveryId = form.getFieldValue("delivery_branch_id");

    if (pickupId && deliveryId && pickupId !== deliveryId) {
      await loadRoutePreview(pickupId, deliveryId);
    } else {
      setRouteDetails(null);
    }
  }

  async function handleSubmit(values) {
    try {
      setSubmitting(true);

      const payload = {
        pickup_branch_id: values.pickup_branch_id,
        delivery_branch_id: values.delivery_branch_id,
        service_types: buildServiceTypesPayload(values),
      };

      if (pricingData?.id) {
        // Edit mode
        await updateBranchPricing(pricingData.id, payload);
        message.success("Branch pricing updated successfully");
      } else {
        // Create mode
        await createBranchPricing(payload);
        message.success("Branch pricing created successfully");
        form.resetFields();
        setRouteDetails(null);
      }

      onSuccess?.();
    } catch (error) {
      const errors = error?.response?.data?.errors;
      if (errors) {
        const firstError = Object.values(errors)
          .flat()
          .find(Boolean);
        if (firstError) {
          message.error(firstError);
          return;
        }
      }
      message.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const pickupBranchId = form.getFieldValue("pickup_branch_id");
  const deliveryBranchId = form.getFieldValue("delivery_branch_id");
  const expressEnabled = form.getFieldValue("express_enabled");
  const sameDayEnabled = form.getFieldValue("same_day_enabled");

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Row gutter={[16, 16]}>
        {/* Branch Selection */}
        <Col xs={24} lg={12}>
          <Card title="Route Selection">
            <Form.Item
              label="Pickup Branch (Origin)"
              name="pickup_branch_id"
              rules={[
                { required: true, message: "Please select pickup branch" },
              ]}
            >
              <Select
                placeholder="Select pickup branch"
                onChange={handleBranchChange}
                optionLabelProp="label"
              >
                {branches.map((b) => (
                  <Select.Option key={b.id} value={b.id} label={b.name}>
                    <div>
                      <Text strong>{b.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {b.code}
                      </Text>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Delivery Branch (Destination)"
              name="delivery_branch_id"
              rules={[
                { required: true, message: "Please select delivery branch" },
                {
                  validator: (_, value) => {
                    if (value === pickupBranchId) {
                      return Promise.reject(
                        new Error(
                          "Pickup and delivery branches must be different"
                        )
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                placeholder="Select delivery branch"
                onChange={handleBranchChange}
                optionLabelProp="label"
              >
                {branches.map((b) => (
                  <Select.Option key={b.id} value={b.id} label={b.name}>
                    <div>
                      <Text strong>{b.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {b.code}
                      </Text>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Card>
        </Col>

        {/* Route Details Preview */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <span>Route Details</span>
                {previewLoading && <LoadingOutlined />}
              </Space>
            }
          >
            {!routeDetails ? (
              <Text type="secondary">Select branches to see route details</Text>
            ) : (
              <>
                <Descriptions size="small" column={1} bordered>
                  <Descriptions.Item label="Route">
                    <Space>
                      <Tag>{routeDetails.pickup_branch.code}</Tag>
                      <ArrowRightOutlined />
                      <Tag>{routeDetails.delivery_branch.code}</Tag>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Distance">
                    {routeDetails.route_details.total_distance_km} km
                  </Descriptions.Item>
                  <Descriptions.Item label="Path">
                    <Text code style={{ fontSize: 12 }}>
                      {routeDetails.route_details.path_text}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Transit Stops">
                    {routeDetails.route_details.transit_count} stop
                    {routeDetails.route_details.transit_count !== 1
                      ? "s"
                      : ""}
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: "12px 0" }} />

                <Text strong style={{ fontSize: 12 }}>
                  Estimated Delivery Times:
                </Text>
                <div style={{ marginTop: 8 }}>
                  {Object.entries(
                    routeDetails.service_type_estimates
                  ).map(([type, est]) => (
                    <div key={type} style={{ marginBottom: 4 }}>
                      <Tag color="blue" style={{ width: 70 }}>
                        {type.toUpperCase()}
                      </Tag>
                      <Text style={{ fontSize: 12 }}>
                        {est.estimated_hours}h
                      </Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Service Type Pricing */}
      <Card title="Service Type Pricing">
        {/* STANDARD (Always Enabled) */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card
              size="small"
              style={{
                background: "#f5f5f5",
                border: "2px solid #1890ff",
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <Tag color="blue">STANDARD</Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    Always Enabled
                  </Text>
                </div>
                <Text type="secondary">
                  {routeDetails?.service_type_estimates?.standard
                    ?.estimated_hours || "?"}{" "}
                  hours delivery
                </Text>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              label="Base Rate (NPR)"
              name="standard_rate"
              rules={[
                { required: true, message: "Base rate is required" },
                { type: "number", min: 1, message: "Must be at least 1" },
              ]}
            >
              <InputNumber
                placeholder="500"
                style={{ width: "100%" }}
                min={1}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* EXPRESS (Optional) */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Form.Item
                name="express_enabled"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox>
                  <Text strong>EXPRESS</Text>
                </Checkbox>
              </Form.Item>
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                {routeDetails?.service_type_estimates?.express
                  ?.estimated_hours || "?"}{" "}
                hours delivery
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              label="Base Rate (NPR)"
              name="express_rate"
              rules={[
                {
                  validator: (_, value) => {
                    if (expressEnabled && (!value || value < 1)) {
                      return Promise.reject(
                        new Error("Base rate is required for express")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                placeholder="750"
                style={{ width: "100%" }}
                disabled={!expressEnabled}
                min={1}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* SAME DAY (Optional) */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Form.Item
                name="same_day_enabled"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox>
                  <Text strong>SAME DAY</Text>
                </Checkbox>
              </Form.Item>
              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                {routeDetails?.service_type_estimates?.same_day
                  ?.estimated_hours || "?"}{" "}
                hour delivery
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              label="Base Rate (NPR)"
              name="same_day_rate"
              rules={[
                {
                  validator: (_, value) => {
                    if (sameDayEnabled && (!value || value < 1)) {
                      return Promise.reject(
                        new Error("Base rate is required for same day")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                placeholder="1500"
                style={{ width: "100%" }}
                disabled={!sameDayEnabled}
                min={1}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Help Text */}
        <Alert
          message="Pricing Configuration"
          description="Standard service is always available. Toggle Express and Same Day options as needed. Higher rates recommended for faster delivery services."
          type="info"
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* Submit Button */}
      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            size="large"
          >
            {pricingData?.id ? "Update Pricing" : "Create Pricing"}
          </Button>
          <Button size="large">Cancel</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
