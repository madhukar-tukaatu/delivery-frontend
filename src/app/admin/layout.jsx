"use client";
import RequireAuth from "@/components/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";


export default function AdminLayout({ children }) {
  return (
    <RequireAuth>
      <div className="admin-layout">
        <DashboardLayout section="admin">{children}</DashboardLayout>
      </div>
    </RequireAuth>
  );
}
