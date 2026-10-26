"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ShipmentDetailDrawer from "@/components/admin/shipments/ShipmentDetailDrawer";

/**
 * One shipment detail drawer for the whole admin area.
 *
 *   const { openShipment } = useShipmentDrawer();
 *   openShipment(230);
 *
 * Mounted once in app/admin/layout.jsx. Outside the provider the hook falls
 * back to the /admin/shipments/{id} deep link (which also opens the drawer).
 */
const ShipmentDrawerContext = createContext(null);

export function ShipmentDrawerProvider({ children }) {
  const [shipmentId, setShipmentId] = useState(null);
  const [open, setOpen] = useState(false);

  const openShipment = useCallback((id) => {
    if (!id) return;
    setShipmentId(id);
    setOpen(true);
  }, []);

  const closeShipment = useCallback(() => {
    setOpen(false);
    setShipmentId(null);
  }, []);

  const value = useMemo(() => ({ openShipment, closeShipment }), [openShipment, closeShipment]);

  return (
    <ShipmentDrawerContext.Provider value={value}>
      {children}
      <ShipmentDetailDrawer open={open} shipmentId={shipmentId} onClose={closeShipment} />
    </ShipmentDrawerContext.Provider>
  );
}

export function useShipmentDrawer() {
  const ctx = useContext(ShipmentDrawerContext);
  if (ctx) return ctx;
  return {
    openShipment: (id) => {
      if (id && typeof window !== "undefined") window.location.assign(`/admin/shipments/${id}`);
    },
    closeShipment: () => {},
  };
}

/**
 * Link-looking trigger that opens the shipment drawer. Keeps a real href so
 * ctrl/cmd/middle-click still opens the deep link in a new tab.
 */
export function ShipmentLink({ id, children, style, className }) {
  const { openShipment } = useShipmentDrawer();
  if (!id) return children ?? "-";
  return (
    <a
      href={`/admin/shipments/${id}`}
      className={className}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        openShipment(id);
      }}
    >
      {children ?? `#${id}`}
    </a>
  );
}

export default ShipmentDrawerProvider;
