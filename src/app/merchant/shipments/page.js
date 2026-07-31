"use client";
import { useRouter } from "next/navigation";
import { Button, SimpleTablePage, StatusTag } from "@/components/PageTools";
export default function ShipmentsPage() {
  const router = useRouter();
  const columns = [
    { title: "Tracking", dataIndex: "tracking_number" },
    { title: "Merchant Order", dataIndex: "merchant_order_id" },
    { title: "Receiver", dataIndex: "receiver_name" },
    { title: "Phone", dataIndex: "receiver_phone" },
    { title: "POD", dataIndex: "pod_amount" },
    { title: "Charge", dataIndex: "delivery_charge" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
    {
      title: "Action",
      render: (_, row) => (
        <Button
          size="small"
          onClick={() => router.push(`/merchant/shipments/${row.id}`)}
        >
          Open
        </Button>
      ),
    },
  ];
  return (
    <SimpleTablePage
      title="Shipments"
      endpoint="/admin/shipments"
      columns={columns}
      extra={
        <Button
          type="primary"
          onClick={() => router.push("/merchant/shipments/create")}
        >
          Create Shipment
        </Button>
      }
    />
  );
}
