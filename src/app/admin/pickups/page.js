"use client";

import { SimpleTablePage, StatusTag } from "@/components/PageTools";
import { Typography, Space } from "antd";
import { EnvironmentOutlined, UserOutlined, ShopOutlined } from "@ant-design/icons";

export default function ListPage() {
  const columns = [
    { 
      title: "Pickup Client/Name", 
      dataIndex: "pickup_name",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{text}</span>
          {record.merchant && (
            <span style={{ fontSize: "12px", color: "#8c8c8c" }}>
              <ShopOutlined /> {record.merchant.name}
            </span>
          )}
        </Space>
      )
    },
    { title: "Phone", dataIndex: "pickup_phone" },
    { 
      title: "Pickup Address Location", 
      dataIndex: "pickup_address",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span>{text}</span>
          <span style={{ fontSize: "11px", color: "#1677ff" }}>
            <EnvironmentOutlined /> {record.pickup_city || "Local Hub Target"} 
            {record.pickup_area ? ` - ${record.pickup_area}` : ""}
          </span>
        </Space>
      )
    },
    {
      title: "Assigned Agent",
      dataIndex: ["assigned_staff", "name"],
      key: "staff",
      render: (text) => text ? (
        <span><UserOutlined /> {text}</span>
      ) : (
        <Typography.Text type="danger" italic>Unassigned</Typography.Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
  ];

  return (
    <SimpleTablePage
      title="Branch Scoped Pickups"
      endpoint="/admin/pickups"
      columns={columns}
    />
  );
}