"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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
  Typography,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { getBranchParentOptions } from "@/services/adminBranchService";

const BranchCoordinatePicker = dynamic(
  () => import("@/components/maps/BranchCoordinatePicker"),
  { ssr: false }
);

const { Text } = Typography;

const BRANCH_TYPE_OPTIONS = [
  { value: "head_branch", label: "Head / Main Branch" },
  { value: "branch", label: "Branch" },
  { value: "franchise_branch", label: "Franchise Branch" },
  { value: "sub_branch", label: "Sub-Branch" },
  { value: "pickup_point", label: "Pickup Point" },
  { value: "delivery_hub", label: "Delivery Hub" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const OPERATING_DAYS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

function isHeadType(type) {
  return type === "head_branch" || type === "main_branch";
}

function normalizeInitialValues(values = {}) {
  return {
    ...values,
    pickup_enabled: values.pickup_enabled ?? true,
    delivery_enabled: values.delivery_enabled ?? true,
    cod_enabled: values.cod_enabled ?? false,
    return_enabled: values.return_enabled ?? false,
    covered_areas: Array.isArray(values.covered_areas)
      ? values.covered_areas
      : [],
    operating_days: Array.isArray(values.operating_days)
      ? values.operating_days
      : [],
  };
}

function normalizePayload(values) {
  const payload = { ...values };

  if (isHeadType(payload.type)) {
    payload.parent_id = null;
  }

  payload.covered_areas = Array.isArray(payload.covered_areas)
    ? payload.covered_areas
    : [];

  payload.operating_days = Array.isArray(payload.operating_days)
    ? payload.operating_days
    : [];

  payload.latitude =
    payload.latitude === "" || payload.latitude === undefined
      ? null
      : payload.latitude;

  payload.longitude =
    payload.longitude === "" || payload.longitude === undefined
      ? null
      : payload.longitude;

  return payload;
}

export default function BranchForm({
  mode = "create",
  initialValues = null,
  submitLabel,
  loading = false,
  onSubmit,
}) {
  const [form] = Form.useForm();

  const [parentOptions, setParentOptions] = useState([]);
  const [parentLoading, setParentLoading] = useState(false);

  const selectedType = Form.useWatch("type", form);
  const latitude = Form.useWatch("latitude", form);
  const longitude = Form.useWatch("longitude", form);

  const isHeadBranch = isHeadType(selectedType);

  useEffect(() => {
    const values = normalizeInitialValues(initialValues || {});

    if (mode === "create") {
      form.setFieldsValue({
        type: "head_branch",
        status: "draft",
        pickup_enabled: true,
        delivery_enabled: true,
        cod_enabled: false,
        return_enabled: false,
        country: "Nepal",
        ...values,
      });
    } else if (initialValues) {
      form.setFieldsValue(values);
    }
  }, [form, initialValues, mode]);

  useEffect(() => {
    let active = true;

    async function loadParentOptions() {
      if (!selectedType || isHeadType(selectedType)) {
        setParentOptions([]);
        return;
      }

      try {
        setParentLoading(true);

        const rows = await getBranchParentOptions(selectedType);

        if (!active) return;

        const options = rows.map((branch) => ({
          value: branch.id,
          label:
            branch.label ||
            [branch.name, branch.type, branch.area, branch.city]
              .filter(Boolean)
              .join(" - "),
        }));

        const currentParent = initialValues?.parent;

        if (
          currentParent?.id &&
          !options.some((option) => Number(option.value) === Number(currentParent.id))
        ) {
          options.unshift({
            value: currentParent.id,
            label: [currentParent.name, currentParent.type, currentParent.area, currentParent.city]
              .filter(Boolean)
              .join(" - "),
          });
        }

        setParentOptions(options);
      } catch (error) {
        console.error("Could not load parent options:", error);
        message.error("Could not load parent branch options.");
      } finally {
        if (active) {
          setParentLoading(false);
        }
      }
    }

    loadParentOptions();

    return () => {
      active = false;
    };
  }, [selectedType, initialValues]);

  const handleTypeChange = () => {
    form.setFieldsValue({
      parent_id: undefined,
    });
  };

  const handleCoordinateChange = ({ latitude: lat, longitude: lng }) => {
    form.setFieldsValue({
      latitude: lat,
      longitude: lng,
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSubmit?.(normalizePayload(values));
  };

  const finalSubmitLabel =
    submitLabel || (mode === "create" ? "Create Branch" : "Update Branch");

  return (
    <Form form={form} layout="vertical">
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Dynamic branch hierarchy"
          description="Parent branch options are automatically limited by the logged-in user’s role and assigned branch hierarchy."
        />

        <Card title="Business Details" bordered={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Branch Name"
                rules={[{ required: true, message: "Branch name is required" }]}
              >
                <Input placeholder="e.g. Kathmandu Main Branch" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="legal_name" label="Legal Company Name">
                <Input placeholder="Registered legal company name" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="owner_name" label="Owner Name">
                <Input placeholder="Owner / franchise owner name" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="contact_person" label="Contact Person">
                <Input placeholder="Main branch contact person" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="branch@example.com" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="Branch phone number" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="alternative_phone" label="Alternative Phone">
                <Input placeholder="Alternative phone number" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="business_type" label="Business Type">
                <Input placeholder="Courier / Franchise / Logistics" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="pan_vat_number" label="PAN / VAT Number">
                <Input placeholder="PAN or VAT number" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="registration_number" label="Registration Number">
                <Input placeholder="Company registration number" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Branch Information" bordered={false}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="type"
                label="Branch Type"
                rules={[{ required: true, message: "Branch type is required" }]}
              >
                <Select
                  placeholder="Select branch type"
                  options={BRANCH_TYPE_OPTIONS}
                  onChange={handleTypeChange}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="parent_id"
                label="Parent Branch"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const type = getFieldValue("type");

                      if (isHeadType(type)) {
                        return Promise.resolve();
                      }

                      if (!value) {
                        return Promise.reject(
                          new Error("Parent branch is required.")
                        );
                      }

                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Select
                  allowClear
                  showSearch
                  disabled={isHeadBranch}
                  loading={parentLoading}
                  placeholder={
                    isHeadBranch
                      ? "Head branch does not need parent"
                      : "Select allowed parent branch"
                  }
                  options={parentOptions}
                  optionFilterProp="label"
                />
              </Form.Item>

              {!isHeadBranch && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Only allowed parent branches are shown.
                </Text>
              )}
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="code" label="Branch Code">
                <Input placeholder="e.g. KTM-MAIN" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="opening_time" label="Opening Time">
                <Input type="time" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="closing_time" label="Closing Time">
                <Input type="time" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="operating_days" label="Operating Days">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Select operating days"
                  options={OPERATING_DAYS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="daily_shipment_capacity"
                label="Daily Shipment Capacity"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="e.g. 500"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Location & Coverage" bordered={false}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="province" label="Province">
                <Input placeholder="Province" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="district" label="District">
                <Input placeholder="District" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="city" label="City">
                <Input placeholder="City" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="area" label="Area">
                <Input placeholder="Area" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="landmark" label="Landmark">
                <Input placeholder="Nearby landmark" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="address" label="Full Address">
                <Input.TextArea rows={3} placeholder="Full branch address" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="coverage_radius_km" label="Coverage Radius KM">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="e.g. 5"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item name="covered_areas" label="Covered Areas">
                <Select
                  mode="tags"
                  allowClear
                  placeholder="Type area and press enter"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="latitude" label="Latitude">
                <Input placeholder="Latitude" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="longitude" label="Longitude">
                <Input placeholder="Longitude" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <BranchCoordinatePicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleCoordinateChange}
              />
            </Col>
          </Row>
        </Card>

        <Card title="Service Capabilities" bordered={false}>
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item
                name="pickup_enabled"
                label="Pickup Enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                name="delivery_enabled"
                label="Delivery Enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                name="cod_enabled"
                label="COD Enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                name="return_enabled"
                label="Return Enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card bordered={false}>
          <Divider style={{ marginTop: 0 }} />

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={loading}
              onClick={handleSubmit}
            >
              {finalSubmitLabel}
            </Button>
          </Space>
        </Card>
      </Space>
    </Form>
  );
}