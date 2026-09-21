"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";

import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CloudSyncOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getPermissions,
  getRoles,
  syncPermissions,
} from "@/services/admin/accessApi";

import { SimpleTablePageWithCRUD } from "@/components/PageTools";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import RoleForm from "@/components/admin/access/roles/RoleForm";
import RolePermissions from "@/components/admin/access/roles/RolePermissions";
import PermissionCatalog from "@/components/admin/access/roles/PermissionCatalog";
import {
  normalizePermissionGroups,
  prettifyLabel,
} from "@/components/admin/access/roles/roleUtils";

const { Text, Title, Paragraph } = Typography;

const PIE_COLORS = ["#1d4ed8", "#0f766e", "#ca8a04", "#dc2626", "#7c3aed", "#0891b2"];

function isSystemRole(role) {
  return role?.name === "super_admin" || Boolean(role?.is_system);
}

function permissionCount(role) {
  return Array.isArray(role?.permissions) ? role.permissions.length : 0;
}

export default function RolesPage() {
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const loadPermissions = useCallback(async () => {
    try {
      setLoadingPermissions(true);
      const data = await getPermissions();
      const normalized = normalizePermissionGroups(data);
      setPermissionGroups(Array.isArray(normalized) ? normalized : []);
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setPermissionGroups([]);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load permissions."
      );
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const data = await getRoles({ per_page: 200 });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.list)
            ? data.list
            : [];
      setRoles(list);
    } catch (error) {
      console.error("Failed to load roles:", error);
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
    loadRoles();
  }, [loadPermissions, loadRoles, refresh]);

  const handleSyncAccess = useCallback(async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      await syncPermissions();
      message.success("Access permissions synchronized successfully.");
      await loadPermissions();
      setRefresh((value) => value + 1);
    } catch (error) {
      console.error("Access synchronization failed:", error);
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Access synchronization failed."
      );
    } finally {
      setSyncing(false);
    }
  }, [loadPermissions, syncing]);

  const handleSuccess = useCallback(() => {
    setRefresh((value) => value + 1);
    loadPermissions();
    loadRoles();
  }, [loadPermissions, loadRoles]);

  const catalogPermissionCount = useMemo(
    () =>
      permissionGroups.reduce(
        (sum, group) => sum + (group.permissions?.length || 0),
        0
      ),
    [permissionGroups]
  );

  const stats = useMemo(() => {
    const system = roles.filter(isSystemRole).length;
    const custom = roles.length - system;
    const totalPermsAssigned = roles.reduce(
      (sum, role) => sum + permissionCount(role),
      0
    );
    const avg =
      roles.length > 0
        ? Math.round(totalPermsAssigned / roles.length)
        : 0;
    const coverage =
      catalogPermissionCount > 0 && roles.length > 0
        ? Math.min(
            100,
            Math.round(
              (new Set(
                roles.flatMap((role) =>
                  (role.permissions || []).map((p) =>
                    typeof p === "string" ? p : p?.name
                  )
                )
              ).size /
                catalogPermissionCount) *
                100
            )
          )
        : 0;

    return {
      totalRoles: roles.length,
      system,
      custom,
      catalogPermissionCount,
      avg,
      coverage,
      groups: permissionGroups.length,
    };
  }, [roles, catalogPermissionCount, permissionGroups.length]);

  const roleBarData = useMemo(
    () =>
      [...roles]
        .map((role) => ({
          name: prettifyLabel(role.label || role.name).slice(0, 16),
          fullName: role.label || role.name,
          permissions: permissionCount(role),
          system: isSystemRole(role),
        }))
        .sort((a, b) => b.permissions - a.permissions)
        .slice(0, 12),
    [roles]
  );

  const mixPieData = useMemo(
    () => [
      { name: "System", value: stats.system },
      { name: "Custom", value: stats.custom },
    ].filter((item) => item.value > 0),
    [stats.system, stats.custom]
  );

  const actionBreakdown = useMemo(() => {
    const buckets = {
      view: 0,
      create: 0,
      edit: 0,
      delete: 0,
      other: 0,
    };

    permissionGroups.forEach((group) => {
      (group.permissions || []).forEach((permission) => {
        const name = permission?.name || "";
        if (name.endsWith(".view")) buckets.view += 1;
        else if (name.endsWith(".create")) buckets.create += 1;
        else if (name.endsWith(".update") || name.endsWith(".edit"))
          buckets.edit += 1;
        else if (name.endsWith(".delete")) buckets.delete += 1;
        else buckets.other += 1;
      });
    });

    return Object.entries(buckets).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [permissionGroups]);

  const columns = [
    {
      title: "Role Key",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (value) => (
        <Text strong code>
          {value || "-"}
        </Text>
      ),
    },
    {
      title: "Label",
      dataIndex: "label",
      key: "label",
      width: 180,
      render: (value, record) => value || prettifyLabel(record?.name),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value) =>
        value || <Text type="secondary">No description</Text>,
    },
    {
      title: "Permissions",
      key: "permissions",
      width: 300,
      render: (_, record) => (
        <RolePermissions
          permissions={
            Array.isArray(record?.permissions) ? record.permissions : []
          }
          limit={5}
        />
      ),
    },
    {
      title: "Count",
      key: "count",
      width: 110,
      align: "center",
      render: (_, record) => {
        const count = permissionCount(record);
        const pct =
          catalogPermissionCount > 0
            ? Math.round((count / catalogPermissionCount) * 100)
            : 0;
        return (
          <Space direction="vertical" size={0} style={{ width: 90 }}>
            <Text strong>{count}</Text>
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor="#1d4ed8"
            />
          </Space>
        );
      },
    },
    {
      title: "Type",
      key: "type",
      width: 110,
      render: (_, record) =>
        isSystemRole(record) ? (
          <Tag color="red">System</Tag>
        ) : (
          <Tag color="blue">Custom</Tag>
        ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "22px clamp(14px, 2vw, 28px) 40px",
        background: "#f4f7fb",
      }}
    >
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <AdminPageHeader
          title="Roles & Permissions"
          subtitle="Design who can see and do what across admin, staff, and merchant portals. Sync route permissions, then assign them to roles with a clear matrix."
          icon={<SafetyCertificateOutlined />}
          breadcrumb={["Admin", "Roles & Permissions"]}
          tags={<Tag color="geekblue">Access control</Tag>}
          actions={
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setRefresh((v) => v + 1)}
                loading={loadingRoles || loadingPermissions}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<CloudSyncOutlined />}
                loading={syncing}
                onClick={handleSyncAccess}
              >
                Sync Access
              </Button>
            </>
          }
        />

        <StatCardGrid>
          <StatCard
            label="Roles"
            value={stats.totalRoles}
            hint={`${stats.system} system / ${stats.custom} custom`}
            variant="primary"
            icon={<TeamOutlined />}
          />
          <StatCard
            label="Permission catalog"
            value={stats.catalogPermissionCount}
            hint={`${stats.groups} groups`}
            variant="accent"
            icon={<AppstoreOutlined />}
          />
          <StatCard
            label="Avg perms / role"
            value={stats.avg}
            hint="Assigned permissions"
            variant="warning"
            icon={<SafetyOutlined />}
          />
          <StatCard
            label="Catalog coverage"
            value={`${stats.coverage}%`}
            hint="Unique perms used by any role"
            variant="success"
            icon={<BarChartOutlined />}
          />
        </StatCardGrid>

        <Card
          style={{
            borderRadius: 18,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { paddingTop: 8 } }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "overview",
                label: (
                  <Space>
                    <BarChartOutlined />
                    Overview
                  </Space>
                ),
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={16}>
                        <Card
                          size="small"
                          title="Permissions per role"
                          style={{ borderRadius: 14, minHeight: 340 }}
                        >
                          {roleBarData.length === 0 ? (
                            <Text type="secondary">No roles loaded yet.</Text>
                          ) : (
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={roleBarData} margin={{ left: 0, right: 8 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                  formatter={(value) => [`${value} permissions`, "Assigned"]}
                                  labelFormatter={(_, payload) =>
                                    payload?.[0]?.payload?.fullName || ""
                                  }
                                />
                                <Bar dataKey="permissions" radius={[8, 8, 0, 0]}>
                                  {roleBarData.map((entry, index) => (
                                    <Cell
                                      key={entry.fullName}
                                      fill={entry.system ? "#dc2626" : PIE_COLORS[index % PIE_COLORS.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </Card>
                      </Col>

                      <Col xs={24} lg={8}>
                        <Card
                          size="small"
                          title="Role mix"
                          style={{ borderRadius: 14, minHeight: 340 }}
                        >
                          {mixPieData.length === 0 ? (
                            <Text type="secondary">No role mix yet.</Text>
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={mixPieData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={55}
                                  outerRadius={85}
                                  paddingAngle={3}
                                >
                                  {mixPieData.map((entry, index) => (
                                    <Cell
                                      key={entry.name}
                                      fill={entry.name === "System" ? "#dc2626" : "#1d4ed8"}
                                    />
                                  ))}
                                </Pie>
                                <RechartsTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                          <Space wrap>
                            {mixPieData.map((item) => (
                              <Tag
                                key={item.name}
                                color={item.name === "System" ? "red" : "blue"}
                              >
                                {item.name}: {item.value}
                              </Tag>
                            ))}
                          </Space>
                        </Card>
                      </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={14}>
                        <Card
                          size="small"
                          title="Catalog by action type"
                          style={{ borderRadius: 14 }}
                        >
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={actionBreakdown}>
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                              <RechartsTooltip />
                              <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </Col>
                      <Col xs={24} lg={10}>
                        <Card
                          size="small"
                          title="Access health"
                          style={{ borderRadius: 14, height: "100%" }}
                        >
                          <Space direction="vertical" size={14} style={{ width: "100%" }}>
                            <div>
                              <Text type="secondary">Catalog coverage</Text>
                              <Progress
                                percent={stats.coverage}
                                strokeColor="#1d4ed8"
                                status={stats.coverage < 40 ? "exception" : "active"}
                              />
                            </div>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              Coverage is the share of catalog permissions that at
                              least one role currently holds. Low coverage usually
                              means new route permissions need assigning after Sync.
                            </Paragraph>
                            <Button
                              type="link"
                              icon={<ApartmentOutlined />}
                              onClick={() => setActiveTab("roles")}
                              style={{ paddingInline: 0 }}
                            >
                              Manage role assignments
                            </Button>
                          </Space>
                        </Card>
                      </Col>
                    </Row>
                  </Space>
                ),
              },
              {
                key: "roles",
                label: (
                  <Space>
                    <TeamOutlined />
                    Roles
                  </Space>
                ),
                children: (
                  <SimpleTablePageWithCRUD
                    title="Role directory"
                    endpoint="/admin/roles"
                    columns={columns}
                    reloadKey={refresh}
                    resource="roles"
                    createLabel="Create role"
                    searchPlaceholder="Search roles by key or label..."
                    modalForm={
                      <RoleForm
                        permissionGroups={permissionGroups}
                        loadingPermissions={loadingPermissions}
                        onSuccess={handleSuccess}
                      />
                    }
                  />
                ),
              },
              {
                key: "catalog",
                label: (
                  <Space>
                    <AppstoreOutlined />
                    Permission catalog
                  </Space>
                ),
                children: (
                  <PermissionCatalog
                    groups={permissionGroups}
                    loading={loadingPermissions}
                  />
                ),
              },
              {
                key: "sync",
                label: (
                  <Space>
                    <CloudSyncOutlined />
                    Sync
                  </Space>
                ),
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Access synchronization"
                      description={
                        <>
                          Sync Access runs the Laravel{" "}
                          <Text code>app:sync-access</Text> flow so permissions
                          from application routes land in the database. After
                          sync, reload roles and assign any new permissions.
                        </>
                      }
                    />
                    <Card style={{ borderRadius: 14 }}>
                      <Space wrap>
                        <Button
                          type="primary"
                          size="large"
                          icon={<CloudSyncOutlined />}
                          loading={syncing}
                          onClick={handleSyncAccess}
                        >
                          Sync Access now
                        </Button>
                        <Button
                          size="large"
                          icon={<ReloadOutlined />}
                          onClick={() => setRefresh((v) => v + 1)}
                        >
                          Reload data
                        </Button>
                      </Space>
                    </Card>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}