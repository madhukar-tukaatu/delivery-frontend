"use client";

import { SimpleTablePage, StatusTag } from "@/components/PageTools";

export default function AdminPodPage() {
  const columns = [
    {
      title: "Tracking #",
      dataIndex: ["shipment", "tracking_number"],
      render: (v, r) => v || r.shipment_id || "-",
    },
    {
      title: "POD Amount",
      dataIndex: "pod_amount",
      render: (v) => `Rs. ${Number(v || 0).toLocaleString("en-NP")}`,
    },
    {
      title: "Collected Amount",
      dataIndex: "collected_amount",
      render: (v) => `Rs. ${Number(v || 0).toLocaleString("en-NP")}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
    {
      title: "Payment Method",
      dataIndex: "payment_method",
      render: (v) => v || "Cash",
    },
    {
      title: "Collected At",
      dataIndex: "collected_at",
      render: (v) => (v ? new Date(v).toLocaleString() : "-"),
    },
  ];

  return (
    <SimpleTablePage
      title="Proof of Delivery (POD)"
      endpoint="/admin/pod"
      columns={columns}
    />
  );
}
