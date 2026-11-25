"use client";

import { useEffect, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";
import { CarOutlined } from "@ant-design/icons";
import Link from "next/link";
import { getShipmentHops } from "@/services/admin/transferService";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";
import { TrStatusTag } from "@/components/admin/transfers/TransferReceiveScanner";

const { Text } = Typography;

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Per-hop transfer rows for one shipment: TR number, trip, vehicle, this parcel's transport share. */
export default function ShipmentTransferHops({ shipmentId, compact = false }) {
  const [hops, setHops] = useState(null);

  useEffect(() => {
    let alive = true;
    getShipmentHops(shipmentId)
      .then((h) => alive && setHops(h))
      .catch(() => alive && setHops([]));
    return () => {
      alive = false;
    };
  }, [shipmentId]);

  if (!hops || !hops.length) return null;
  const total = hops.reduce((a, h) => a + Number(h.transport_cost || 0), 0);

  if (compact) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          padding: "10px 12px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "#0f172a",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <span>
            <CarOutlined style={{ color: "#0891b2", marginRight: 6 }} />
            Transfer hops
          </span>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
            Transport total Rs {total.toFixed(2)}
          </Text>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {hops.map((h, i) => (
            <div
              key={`${h.dispatch_manifest_id || "x"}-${i}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                background: "#f8fafc",
                border: "1px solid #eef2f7",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <div style={{ flex: "0 0 auto", minWidth: 92 }}>
                {h.dispatch_manifest_id ? (
                  <Link href={`/admin/transfers?tab=history&tr=${h.dispatch_manifest_id}`}>
                    <Text strong style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", color: "#0e7490" }}>
                      {h.transfer_number || h.manifest_number || `#${h.dispatch_manifest_id}`}
                    </Text>
                  </Link>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </div>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {h.from_branch_name || `#${h.from_branch_id ?? "?"}`} → {h.to_branch_name || `#${h.to_branch_id ?? "?"}`}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {[vehicleLabel(h.vehicle_type), h.vehicle_number].filter(Boolean).join(" · ") || "—"}
                  {h.dispatched_at ? ` · out ${fmt(h.dispatched_at)}` : ""}
                  {h.received_at ? ` · in ${fmt(h.received_at)}` : " · on the way"}
                </div>
              </div>
              <div style={{ flex: "0 0 auto", textAlign: "right", marginLeft: "auto" }}>
                {h.manifest_status ? <TrStatusTag status={h.manifest_status} /> : null}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Rs {Number(h.transport_cost || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card
      size="small"
      title={
        <span>
          <CarOutlined /> Transfer hops
        </span>
      }
      extra={<Text type="secondary" style={{ fontSize: 12 }}>Transport total Rs {total.toFixed(2)}</Text>}
    >
      <Table
        size="small"
        rowKey={(h, i) => `${h.dispatch_manifest_id || "x"}-${i}`}
        pagination={false}
        dataSource={hops}
        scroll={{ x: 700 }}
        columns={[
          {
            title: "TR",
            key: "tr",
            render: (_, h) =>
              h.dispatch_manifest_id ? (
                <Link href={`/admin/transfers?tab=history&tr=${h.dispatch_manifest_id}`}>
                  <Text strong>{h.transfer_number || h.manifest_number || `#${h.dispatch_manifest_id}`}</Text>
                </Link>
              ) : (
                <Text type="secondary">-</Text>
              ),
          },
          {
            title: "Trip",
            key: "trip",
            render: (_, h) => `${h.from_branch_name || `#${h.from_branch_id ?? "?"}`} → ${h.to_branch_name || `#${h.to_branch_id ?? "?"}`}`,
          },
          {
            title: "Vehicle",
            key: "vehicle",
            render: (_, h) => [vehicleLabel(h.vehicle_type), h.vehicle_number].filter(Boolean).join(" · ") || "-",
          },
          { title: "Transport share", dataIndex: "transport_cost", align: "right", render: (v) => `Rs ${Number(v || 0).toFixed(2)}` },
          { title: "Dispatched", dataIndex: "dispatched_at", render: fmt },
          {
            title: "Received",
            key: "received",
            render: (_, h) => (h.received_at ? fmt(h.received_at) : <Tag color="processing" style={{ margin: 0 }}>On the way</Tag>),
          },
          { title: "TR status", dataIndex: "manifest_status", render: (v) => (v ? <TrStatusTag status={v} /> : "-") },
        ]}
      />
    </Card>
  );
}
