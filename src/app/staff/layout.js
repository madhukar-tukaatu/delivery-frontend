"use client";
import RequireAuth from "@/components/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";
export default function StaffLayout({ children }) {
  return (
    <RequireAuth>
      <DashboardLayout section="staff">{children}</DashboardLayout>
    </RequireAuth>
  );
}
