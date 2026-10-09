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
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

/** Per-hop transfer rows for one shipment: TR number, trip, vehicle, this parcel's transport share. */
export default function ShipmentTransferHops({ shipmentId }) {
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
