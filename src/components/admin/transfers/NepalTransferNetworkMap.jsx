"use client";

import dynamic from "next/dynamic";
import { Card, Space, Typography } from "antd";
import { CompassOutlined } from "@ant-design/icons";

const { Text } = Typography;

const NepalTransferNetworkMapClient = dynamic(
  () => import("./NepalTransferNetworkMapClient"),
  {
    ssr: false,
    loading: () => (
      <Card
        size="small"
        style={{
          borderRadius: 10,
          height: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
        }}
      >
        <Space direction="vertical" align="center">
          <CompassOutlined spin style={{ fontSize: 32, color: "#38bdf8" }} />
          <Text style={{ color: "#94a3b8" }}>Loading live transfer map...</Text>
        </Space>
      </Card>
    ),
  }
);

export default function NepalTransferNetworkMap(props) {
  return <NepalTransferNetworkMapClient {...props} />;
}
