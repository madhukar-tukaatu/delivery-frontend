"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from "antd";
import { EnvironmentOutlined, SaveOutlined } from "@ant-design/icons";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 420,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

function makeCode(name, type) {
  const prefix = type === "main_branch_zone" ? "MAIN" : "SUB";

  return (
    prefix +
    "-" +
    String(name || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

export default function CoverageLocationForm({
  mode = "create",
  initialValues,
  mainZones = [],
  existingLocations = [],
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  const type = Form.useWatch("type", form);
  const radius = Form.useWatch("coverage_radius_km", form);
  const latitude = Form.useWatch("latitude", form);
  const longitude = Form.useWatch("longitude", form);

  const isSub = type === "sub_branch_zone";

  const selectedMapValue = useMemo(
    () => ({
      latitude,
      longitude,
    }),
    [latitude, longitude],
  );

  useEffect(() => {
    const defaults = {
      type: "main_branch_zone",
      country: "Nepal",
      province: "Bagmati",
      district: "Kathmandu",
      city: "Kathmandu",
      coverage_radius_km: 5,
      status: "active",
      is_hq_managed: true,
      ...initialValues,
    };

    if (defaults.type === "sub_branch_zone" && !defaults.coverage_radius_km) {
      defaults.coverage_radius_km = 3;
    }

    form.setFieldsValue(defaults);
  }, [form, initialValues]);

  function onMapChange(location) {
    form.setFieldsValue({
      latitude: location.latitude ?? form.getFieldValue("latitude"),
      longitude: location.longitude ?? form.getFieldValue("longitude"),
      address: location.address || form.getFieldValue("address"),
      city: location.city || form.getFieldValue("city"),
      area: location.area || form.getFieldValue("area"),
      street: location.street || form.getFieldValue("street"),
      landmark: location.landmark || form.getFieldValue("landmark"),
    });
  }

  async function handleSubmit() {
    const values = await form.validateFields();

    const payload = {
      ...values,
      code: values.code || makeCode(values.name, values.type),
    };

    if (payload.type === "main_branch_zone") {
      payload.parent_id = null;
    }

    await onSubmit(payload);
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={10}>
        <Card style={{ background: "#ffffff" }}>
          <Form form={form} layout="vertical">
            <Form.Item
              label="Allocation Type"
              name="type"
              rules={[{ required: true }]}
              style={{ display:"none" }}
            >
              <Select
                disabled={true}
                options={[
                  {
                    value: "main_branch_zone",
                    label: "Main Branch Allocation",
                  },
                  {
                    value: "sub_branch_zone",
                    label: "Sub-Branch Allocation",
                  },
                ]}
              />
            </Form.Item>

            {isSub && (
              <Form.Item
                label="Parent Main Branch Allocation"
                name="parent_id"
                rules={[
                  {
                    required: true,
                    message: "Select parent main branch allocation.",
                  },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Select parent main branch allocation"
                  optionFilterProp="label"
                  options={mainZones.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.code})`,
                  }))}
                />
              </Form.Item>
            )}

            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={
                    isSub
                      ? "Sub-Branch Allocation Name"
                      : "Main Branch Allocation Name"
                  }
                  name="name"
                  rules={[{ required: true }]}
                >
                  <Input
                    placeholder={
                      isSub
                        ? "Thamel Sub-Branch Zone"
                        : "Pokhara Main Branch Zone"
                    }
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item label="Code" name="code">
                  <Input placeholder="Auto or custom code" />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: "none" }}>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Country" name="country">
                    <Input placeholder="Nepal" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Province" name="province">
                    <Input placeholder="Province" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="District" name="district">
                    <Input placeholder="District" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="City" name="city">
                    <Input placeholder="City" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item label="Area" name="area">
                    <Input placeholder="Area" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Street" name="street">
                    <Input placeholder="Street / road" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Landmark" name="landmark">
                <Input placeholder="Landmark" />
              </Form.Item>

              <Form.Item label="Address" name="address">
                <Input.TextArea rows={2} placeholder="Full address" />
              </Form.Item>
            </div>

            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Latitude"
                  name="latitude"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: "100%" }} stringMode />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Longitude"
                  name="longitude"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: "100%" }} stringMode />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Coverage Radius KM"
              name="coverage_radius_km"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0.1}
                max={100}
                step={0.5}
                style={{ width: "100%" }}
              />
            </Form.Item>

            <div style={{ display:"none" }}>
              <Form.Item label="Status" name="status">
                <Select
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </Form.Item>

              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </div>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={onCancel}>Cancel</Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSubmit}
              >
                {mode === "edit" ? "Update Allocation" : "Save Allocation"}
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>

      <Col xs={24} xl={14}>
        <Card
          title={
            <Space>
              <EnvironmentOutlined />
              <span>Map Radius Allocation</span>
            </Space>
          }
          style={{ background: "#ffffff" }}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Click map to select the assigned coverage point"
            description="This point is used for coverage, routing, nearest branch selection, and pricing."
          />

          <CoverageRadiusMap
            value={selectedMapValue}
            radiusKm={radius || (isSub ? 3 : 5)}
            existingLocations={existingLocations}
            existingBranches={[]}
            onChange={onMapChange}
          />
        </Card>
      </Col>
    </Row>
  );
}
