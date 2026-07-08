"use client";
import RequireAuth from "@/components/RequireAuth";
import DashboardLayout from "@/components/DashboardLayout";
export default function MerchantLayout({ children }) {
  return (
    <RequireAuth>
      <DashboardLayout section="merchant">{children}</DashboardLayout>
    </RequireAuth>
  );
}
