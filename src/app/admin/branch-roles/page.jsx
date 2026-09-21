"use client";

import { useMemo, useState } from "react";
import {
  Badge, Card, Col, Collapse, Row, Space, Tag, Tooltip, Typography,
} from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";

const { Text, Title } = Typography;

// The roles a branch manager's staff can have, with their permission sets
const BRANCH_STAFF_ROLES = [
  {
    name: "booking_staff",
    label: "Booking Staff",
    color: "blue",
    description: "Books shipments, manages customers, calculates quotes via admin portal.",
    permissions: [
      "dashboard.view",
      "customers.view", "customers.create", "customers.edit",
      "shipments.view", "shipments.create", "shipments.edit", "shipments.quote", "shipments.print_label",
      "pickups.view", "pickups.create",
      "rates.view", "rates.calculate",
      "pricing.service_types.view", "pricing.branch_rates.view", "pricing.simulator.use",
      "notifications.view",
    ],
  },
  {
    name: "pickup_staff",
    label: "Pickup Staff",
    color: "cyan",
    description: "Handles assigned pickup tasks via staff portal.",
    permissions: [
      "staff.dashboard", "staff.pickups",
      "shipments.view",
      "pickups.view", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed",
      "notifications.view",
    ],
  },
  {
    name: "dispatch_staff",
    label: "Dispatch Staff",
    color: "orange",
    description: "Manages transfers, dispatches and route workflow.",
    permissions: [
      "staff.dashboard",
      "shipments.view", "shipments.status", "shipments.lifecycle",
      "shipment_tasks.view", "shipment_tasks.assign", "shipment_tasks.status",
      "pickups.view", "pickups.status",
      "deliveries.view", "deliveries.assign", "deliveries.status",
      "dispatches.view", "dispatches.create", "dispatches.receive",
      "dispatches.dispatch", "dispatches.transfer_batches", "dispatches.route_workflow",
      "notifications.view",
    ],
  },
  {
    name: "support_staff",
    label: "Support Staff",
    color: "geekblue",
    description: "Views shipments, customers, merchants and handles support tickets.",
    permissions: [
      "staff.dashboard",
      "shipments.view",
      "customers.view",
      "merchants.view",
      "pickups.view", "deliveries.view", "dispatches.view",
      "support.view", "support.manage",
      "notifications.view",
    ],
  },
  {
    name: "accounts_staff",
    label: "Accounts Staff",
    color: "gold",
    description: "Manages POD, settlements, invoices and financial reports.",
    permissions: [
      "staff.dashboard",
      "shipments.view",
      "pod.view", "pod.collect", "pod.confirm", "pod.deposit", "pod.rider_deposit", "pod.collections", "pod.settle",
      "settlements.view", "settlements.create", "settlements.pay",
      "invoices.view", "invoices.create", "receipts.view", "receipts.create",
      "reports.view", "reports.pod", "reports.revenue",
      "notifications.view",
    ],
  },
  {
    name: "delivery_staff",
    label: "Delivery Staff",
    color: "green",
    description: "Handles delivery tasks via staff portal.",
    permissions: [
      "staff.dashboard", "staff.deliveries",
      "shipments.view",
      "deliveries.view", "deliveries.status", "deliveries.accept",
      "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
      "notifications.view",
    ],
  },
  {
    name: "rider",
    label: "Rider",
    color: "green",
    description: "Pickup and delivery rider — uses staff portal for tasks and POD.",
    permissions: [
      "staff.dashboard", "staff.pickups", "staff.deliveries", "staff.pod", "staff.rider_location",
      "shipments.view",
      "pickups.view", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed",
      "deliveries.view", "deliveries.status", "deliveries.accept",
      "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
      "pod.view", "pod.collect",
      "notifications.view",
    ],
  },
  {
    name: "warehouse_staff",
    label: "Warehouse Staff",
    color: "lime",
    description: "Manages warehouse receiving and dispatch operations.",
    permissions: [
      "staff.dashboard",
      "shipments.view", "shipments.status",
      "dispatches.view", "dispatches.receive",
      "notifications.view",
    ],
  },
];

function getPermissionColor(name = "") {
  if (name.startsWith("staff.")) return "purple";
  if (name.endsWith(".view")) return "blue";
  if (name.endsWith(".create")) return "green";
  if (name.endsWith(".edit") || name.endsWith(".update")) return "orange";
  if (name.endsWith(".manage")) return "volcano";
  if (name.endsWith(".status")) return "cyan";
  return "default";
}

export default function BranchRolesPage() {
  const { isSuperAdmin, isBranchManager } = usePermissions();

  const collapseItems = BRANCH_STAFF_ROLES.map((role) => ({
    key: role.name,
    label: (
      <Space>
        <Tag color={role.color} style={{ margin: 0 }}>{role.label}</Tag>
        <Badge
          count={role.permissions.length}
          style={{ backgroundColor: "#1677ff" }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>{role.description}</Text>
      </Space>
    ),
    children: (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {role.permissions.map((p) => (
          <Tooltip key={p} title={p}>
            <Tag color={getPermissionColor(p)} style={{ margin: 0, fontSize: 11 }}>{p}</Tag>
          </Tooltip>
        ))}
      </div>
    ),
  }));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Branch Staff Roles</Title>
        <Text type="secondary">
          These are the roles you can assign to your branch staff. Each role has a fixed set of permissions.
          Contact a system administrator to request permission changes.
        </Text>
      </div>

      <Collapse
        items={collapseItems}
        defaultActiveKey={BRANCH_STAFF_ROLES.map((r) => r.name)}
      />
    </div>
  );
}
