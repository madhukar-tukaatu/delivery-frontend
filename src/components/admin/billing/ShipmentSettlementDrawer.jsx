"use client";

import { Drawer, Typography } from "antd";
import ShipmentSettlementBreakdown from "@/components/admin/billing/ShipmentSettlementBreakdown";
import { useShipmentDrawer } from "@/components/admin/shipments/ShipmentDrawerProvider";

const { Title } = Typography;

/** Right-side drawer with the full settlement breakdown of one shipment. */
export default function ShipmentSettlementDrawer({ open, shipmentId, onClose }) {
  const { openShipment } = useShipmentDrawer();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={Math.min(980, typeof window !== "undefined" ? window.innerWidth : 980)}
      title={<Title level={5} style={{ margin: 0 }}>Delivery-charge settlement</Title>}
      destroyOnClose
      styles={{ body: { background: "#f5f7fa", padding: 12 } }}
    >
      {shipmentId ? <ShipmentSettlementBreakdown shipmentId={shipmentId} onOpenShipment={openShipment} /> : null}
    </Drawer>
  );
}
