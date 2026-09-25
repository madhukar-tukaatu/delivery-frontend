"use client";
import RequireAuth from "@/components/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";
import "./admin-theme.css";

export default function AdminLayout({ children }) {
  return (
    <RequireAuth>
      <div className="admin-layout">
        <DashboardLayout section="admin">{children}</DashboardLayout>
      </div>
    </RequireAuth>
  );
}
