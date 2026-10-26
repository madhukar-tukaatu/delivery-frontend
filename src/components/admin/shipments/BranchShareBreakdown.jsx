"use client";

import ShipmentSettlementBreakdown from "@/components/admin/billing/ShipmentSettlementBreakdown";

/**
 * Delivery-charge split per branch for one shipment, shown inside the shipment drawer.
 * Uses GET admin/inter-branch-settlements/shipments/{id} (branch-scoped; a 404 hides the card),
 * so branch managers without branch_shares.view still see it.
 */
export default function BranchShareBreakdown({ shipmentId }) {
  if (!shipmentId) return null;
  return <ShipmentSettlementBreakdown shipmentId={shipmentId} compact />;
}
