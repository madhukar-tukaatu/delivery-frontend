"use client";

import { Alert } from "antd";
import { usePermissions } from "@/hooks/usePermission";

const HQ_ROLES = ["super_admin", "main_admin", "admin"];

/**
 * True for HQ users (super admin / main admin). Finance APIs are not branch-filtered for them.
 */
export function useIsFinanceHq() {
  const { isSuperAdmin, roles, primaryRole } = usePermissions();

  return (
    Boolean(isSuperAdmin) ||
    (roles || []).some((r) => HQ_ROLES.includes(r)) ||
    HQ_ROLES.includes(primaryRole)
  );
}

/**
 * Finance pages: tell branch users the list is limited to their branch.
 * The filter itself is enforced by the API; this is only a label.
 */
export default function BranchScopeNotice({ style }) {
  const { loading, branchId, branchName } = usePermissions();
  const isHq = useIsFinanceHq();

  if (loading || isHq) return null;

  const label = branchName || (branchId ? `Branch #${branchId}` : null);

  return (
    <Alert
      type="info"
      showIcon
      style={style}
      message={
        label
          ? `Showing ${label} only. Other branches' finance records are hidden.`
          : "No branch is assigned to your account, so no finance records are shown."
      }
    />
  );
}
