"use client";
import { Card, Typography, Spin } from "antd";
import {
  NodeIndexOutlined, ShopOutlined, InboxOutlined, ThunderboltOutlined,
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, CarOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const STAT_CONFIG = [
  { key: "branches",            label: "Branches",          icon: <NodeIndexOutlined />,    color: "#027196" },
  { key: "merchants",           label: "Merchants",         icon: <ShopOutlined />,         color: "#0B8CB7" },
  { key: "shipments",           label: "Total Shipments",   icon: <InboxOutlined />,        color: "#6366F1" },
  { key: "today_shipments",     label: "Today",             icon: <ThunderboltOutlined />,  color: "#F59E0B" },
  { key: "delivered_shipments", label: "Delivered",         icon: <CheckCircleOutlined />,  color: "#10B981" },
  { key: "pending_shipments",   label: "Pending",           icon: <ClockCircleOutlined />,  color: "#EF4444" },
  { key: "cod_pending",         label: "COD Pending",       icon: <DollarOutlined />,       color: "#FFD026" },
  { key: "delivery_assignments",label: "Assignments",       icon: <CarOutlined />,          color: "#8B5CF6" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/merchant/dashboard")
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, color: "#1E293B", fontWeight: 800 }}>
          Merchant Dashboard
        </Typography.Title>
        <Typography.Text style={{ color: "#64748B", fontSize: 14 }}>
          Overview of your shipments and COD operations
        </Typography.Text>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 20,
        }}>
          {STAT_CONFIG.map(({ key, label, icon, color }) => (
            <Card
              key={key}
              style={{
                borderRadius: 16,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                overflow: "hidden",
                transition: "all 0.25s ease",
              }}
              styles={{ body: { padding: "20px 24px" } }}
              hoverable
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#1E293B", lineHeight: 1 }}>
                    {(stats[key] ?? 0).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, color,
                }}>
                  {icon}
                </div>
              </div>
              <div style={{ height: 3, background: color, borderRadius: 2, marginTop: 16, opacity: 0.7 }} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
