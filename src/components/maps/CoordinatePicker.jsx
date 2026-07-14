"use client";

import { Form, Input, Alert, Space } from "antd";
import BranchCoordinatePicker from "@/components/maps/BranchCoordinatePicker";

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return Number(number.toFixed(7));
}

export default function CoordinatePicker({ form }) {
  const latitude = Form.useWatch("latitude", form);
  const longitude = Form.useWatch("longitude", form);

  const handleChange = ({ latitude: nextLatitude, longitude: nextLongitude }) => {
    form.setFieldsValue({
      latitude: normalizeCoordinate(nextLatitude),
      longitude: normalizeCoordinate(nextLongitude),
    });

    form.validateFields(["latitude", "longitude"]).catch(() => {});
  };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Select pickup location"
        description="Click on the map to select the exact pickup location. Latitude and longitude will be saved automatically."
      />

      <Form.Item
        name="latitude"
        hidden
        rules={[
          {
            required: true,
            message: "Please select pickup location from map.",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="longitude"
        hidden
        rules={[
          {
            required: true,
            message: "Please select pickup location from map.",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <BranchCoordinatePicker
        latitude={latitude}
        longitude={longitude}
        onChange={handleChange}
        height={360}
      />
    </Space>
  );
}