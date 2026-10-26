"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShipmentsPage from "@/app/admin/shipments/page";
import ShipmentDetailDrawer from "@/components/admin/shipments/ShipmentDetailDrawer";

/**
 * Deep link /admin/shipments/{id}: the shipments list with the shipment
 * detail side drawer open on top. Closing the drawer goes back to the list.
 * Everywhere else in admin the drawer opens in place (useShipmentDrawer).
 */
export default function AdminShipmentDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params?.id;
  const [open, setOpen] = useState(true);

  return (
    <>
      <AdminShipmentsPage />
      <ShipmentDetailDrawer
        open={open && !!shipmentId}
        shipmentId={shipmentId}
        onClose={() => {
          setOpen(false);
          router.replace("/admin/shipments");
        }}
      />
    </>
  );
}
