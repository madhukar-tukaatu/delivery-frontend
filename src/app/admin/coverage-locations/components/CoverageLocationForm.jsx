"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Alert, Button, Card, Col, Descriptions, Form, Input,
  InputNumber, Row, Select, Space, Tag, Typography,
} from "antd";
import { EnvironmentOutlined, SaveOutlined } from "@ant-design/icons";
import { makeCoverageCode } from "@/lib/nepalDistrictAbbr";

const { Text } = Typography;

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: 420, background: "#f8fafc", border: "1px solid #e5e7eb",
        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        Loading map...
      </div>
    ),
  },
);

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

  const type     = Form.useWatch("type", form);
  const name     = Form.useWatch("name", form);
  const radius   = Form.useWatch("coverage_radius_km", form);
  const latitude  = Form.useWatch("latitude", form);
  const longitude = Form.useWatch("longitude", form);
  const province  = Form.useWatch("province", form);
  const district  = Form.useWatch("district", form);
  const city      = Form.useWatch("city", form);
  const area      = Form.useWatch("area", form);
  const street    = Form.useWatch("street", form);
  const landmark  = Form.useWatch("landmark", form);
  const address   = Form.useWatch("address", form);

  const isSub     = type === "sub_branch_zone";
  const codePreview = mode === "create" ? makeCoverageCode(name, type) : null;
  const hasCoords = latitude != null && latitude !== "" && longitude != null && longitude !== "";

  const selectedMapValue = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  useEffect(() => {
    const defaults = {
      type: "main_branch_zone",
      country: "Nepal",
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
      latitude:  location.latitude  ?? form.getFieldValue("latitude"),
      longitude: location.longitude ?? form.getFieldValue("longitude"),
      address:   location.address   || form.getFieldValue("address"),
      province:  location.province  || form.getFieldValue("province"),
      district:  location.district  || form.getFieldValue("district"),
      city:      location.city      || form.getFieldValue("city"),
      area:      location.area      || form.getFieldValue("area"),
      street:    location.street    || form.getFieldValue("street"),
      landmark:  location.landmark  || form.getFieldValue("landmark"),
    });
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const payload = {
      ...values,
      code: values.code || makeCoverageCode(values.name, values.type),
    };
    if (payload.type === "main_branch_zone") payload.parent_id = null;
    await onSubmit(payload);
  }

  // Location detail rows for the read-only card
  const locationDetails = [
    { label: "Province",  value: province },
    { label: "District",  value: district },
    { label: "City",      value: city },
    { label: "Area",      value: area },
    { label: "Street",    value: street },
    { label: "Landmark",  value: landmark },
    { label: "Address",   value: address, span: 2 },
  ];

  return (
    <Row gutter={[16, 16]}>

      {/* ── Left: Form ── */}
      <Col xs={24} xl={10}>
        <Card style={{ background: "#fff" }}>
          <Form form={form} layout="vertical">

            {/* Hidden fields — submitted but not shown */}
            <Form.Item name="type"         hidden><Input /></Form.Item>
            <Form.Item name="is_hq_managed" hidden><Input /></Form.Item>
            <Form.Item name="country"      hidden><Input /></Form.Item>
            <Form.Item name="status"       hidden><Input /></Form.Item>
            <Form.Item name="province"     hidden><Input /></Form.Item>
            <Form.Item name="district"     hidden><Input /></Form.Item>
            <Form.Item name="city"         hidden><Input /></Form.Item>
            <Form.Item name="area"         hidden><Input /></Form.Item>
            <Form.Item name="street"       hidden><Input /></Form.Item>
            <Form.Item name="landmark"     hidden><Input /></Form.Item>
            <Form.Item name="address"      hidden><Input /></Form.Item>

            {/* Type badge */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Allocation Type</Text>
              <div style={{ marginTop: 4 }}>
                <Tag color={isSub ? "green" : "blue"} style={{ fontSize: 13, padding: "2px 10px" }}>
                  {isSub ? "Sub-Branch Zone" : "Main Branch Zone"}
                </Tag>
              </div>
            </div>

            {/* Parent zone (sub only) */}
            {isSub && (
              <Form.Item
                label="Parent Main Branch Allocation"
                name="parent_id"
                rules={[{ required: true, message: "Select parent main branch allocation." }]}
              >
                <Select
                  showSearch
                  placeholder="Select parent main branch allocation"
                  optionFilterProp="label"
                  options={mainZones.map(item => ({
                    value: item.id,
                    label: `${item.name} (${item.code})`,
                  }))}
                />
              </Form.Item>
            )}

            {/* Name + Code */}
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={isSub ? "Sub-Branch Allocation Name" : "Main Branch Allocation Name"}
                  name="name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder={isSub ? "Thamel Sub-Branch Zone" : "Pokhara Main Branch Zone"} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Code"
                  name="code"
                  extra={
                    mode === "create"
                      ? codePreview ? `Will be saved as: ${codePreview}` : "Auto-generated from name."
                      : "Code cannot be changed after creation."
                  }
                >
                  <Input disabled placeholder={mode === "create" ? "Type name to preview" : ""} />
                </Form.Item>
              </Col>
            </Row>

            {/* Lat / Lng — read-only, driven by map */}
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Latitude"
                  name="latitude"
                  rules={[{ required: true, message: "Click the map to pin a location." }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    stringMode
                    readOnly
                    placeholder="Click map to set"
                    styles={{ input: { background: "#f8fafc", cursor: "default" } }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Longitude"
                  name="longitude"
                  rules={[{ required: true, message: "Click the map to pin a location." }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    stringMode
                    readOnly
                    placeholder="Click map to set"
                    styles={{ input: { background: "#f8fafc", cursor: "default" } }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Coverage radius */}
            <Form.Item
              label="Coverage Radius (km)"
              name="coverage_radius_km"
              rules={[{ required: true }]}
            >
              <InputNumber min={0.1} max={100} step={0.5} style={{ width: "100%" }} />
            </Form.Item>

            {/* Location details — read-only card, appears after pin */}
            {hasCoords && (
              <Card
                size="small"
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Space style={{ marginBottom: 8 }}>
                  <EnvironmentOutlined style={{ color: "#0369a1" }} />
                  <Text style={{ fontSize: 12, fontWeight: 600, color: "#0369a1" }}>Pinned Location Details</Text>
                </Space>
                <Descriptions
                  size="small"
                  column={2}
                  labelStyle={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}
                  contentStyle={{ fontSize: 12, color: "#0f172a" }}
                  items={locationDetails.map(({ label, value, span }) => ({
                    key: label,
                    label,
                    span: span || 1,
                    children: value || <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
                  }))}
                />
              </Card>
            )}

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={onCancel}>Cancel</Button>
              <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
                {mode === "edit" ? "Update Allocation" : "Save Allocation"}
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>

      {/* ── Right: Map ── */}
      <Col xs={24} xl={14}>
        <Card
          title={<Space><EnvironmentOutlined /><span>Map Radius Allocation</span></Space>}
          style={{ background: "#fff" }}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Click the map to pin the coverage point"
            description="Coordinates and location details (province, district, city, area) will be resolved automatically from the pinned point."
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
