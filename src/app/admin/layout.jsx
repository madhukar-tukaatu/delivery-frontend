"use client";
import RequireAuth from "@/components/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ShipmentDrawerProvider } from "@/components/admin/shipments/ShipmentDrawerProvider";
import "./admin-theme.css";

export default function AdminLayout({ children }) {
  return (
    <RequireAuth>
      <div className="admin-layout">
        <ShipmentDrawerProvider>
          <DashboardLayout section="admin">{children}</DashboardLayout>
        </ShipmentDrawerProvider>
      </div>
    </RequireAuth>
  );
}
