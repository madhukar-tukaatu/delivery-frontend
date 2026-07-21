"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layout, Menu, Typography, Button, Space, Spin, Empty,
  Avatar, Dropdown, Badge, Tooltip,
} from "antd";
import {
  AppstoreOutlined, ShopOutlined, NodeIndexOutlined, InboxOutlined,
  CarOutlined, DollarOutlined, SettingOutlined, LogoutOutlined,
  ApiOutlined, FileTextOutlined, UserOutlined, SafetyCertificateOutlined,
  MenuOutlined, TeamOutlined, BarChartOutlined, BellOutlined,
  CustomerServiceOutlined, ReloadOutlined, CheckSquareOutlined,
  EnvironmentOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  GlobalOutlined, SearchOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { clearAuth, getUser } from "@/lib/auth";
import { getMyMenus } from "@/services/menuService";

const { Header, Sider, Content } = Layout;

const iconMap = {
  dashboard: <AppstoreOutlined />,
  branches: <NodeIndexOutlined />,
  branch: <NodeIndexOutlined />,
  users: <UserOutlined />,
  roles: <SafetyCertificateOutlined />,
  shield: <SafetyCertificateOutlined />,
  menus: <MenuOutlined />,
  menu: <MenuOutlined />,
  merchants: <ShopOutlined />,
  merchant: <ShopOutlined />,
  store: <ShopOutlined />,
  customers: <TeamOutlined />,
  rates: <DollarOutlined />,
  shipments: <InboxOutlined />,
  package: <InboxOutlined />,
  pickups: <CarOutlined />,
  pickup: <CarOutlined />,
  dispatches: <CarOutlined />,
  dispatch: <CarOutlined />,
  deliveries: <CarOutlined />,
  delivery: <CarOutlined />,
  truck: <CarOutlined />,
  pod: <DollarOutlined />,
  money: <DollarOutlined />,
  settlements: <DollarOutlined />,
  invoices: <FileTextOutlined />,
  webhooks: <ApiOutlined />,
  api: <ApiOutlined />,
  reports: <BarChartOutlined />,
  support: <CustomerServiceOutlined />,
  notifications: <BellOutlined />,
  settings: <SettingOutlined />,
  refresh: <ReloadOutlined />,
  checklist: <CheckSquareOutlined />,
  location: <EnvironmentOutlined />,
};

function getIcon(icon) {
  return iconMap[icon] || <AppstoreOutlined />;
}

function buildMenuItems(menus = []) {
  return menus
    .filter((item) => item?.path && item?.label)
    .map((item) => {
      const children = item.children?.length
        ? buildMenuItems(item.children)
        : undefined;
      return { key: item.path, icon: getIcon(item.icon), label: item.label, children };
    });
}

function findSelectedKey(pathname, menus = []) {
  const flat = [];
  function collect(items = []) {
    items.forEach((item) => {
      if (item.path) flat.push(item.path);
      if (item.children?.length) collect(item.children);
    });
  }
  collect(menus);
  const matched = flat
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length);
  return matched[0] || pathname;
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626"];
function avatarColor(name = "") {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

export default function DashboardLayout({ section = "admin", children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadMenus() {
      try {
        setLoadingMenus(true);
        const data = await getMyMenus(section);
        if (active) setMenus(data);
      } catch {
        if (active) setMenus([]);
      } finally {
        if (active) setLoadingMenus(false);
      }
    }
    loadMenus();
    return () => { active = false; };
  }, [section]);

  const items = useMemo(() => buildMenuItems(menus), [menus]);
  const selectedKey = useMemo(() => findSelectedKey(pathname, menus), [pathname, menus]);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  function handleMenuClick({ key }) {
    if (key && key !== pathname) router.push(key);
  }

  const userDropdownItems = {
    items: [
      { key: "profile", icon: <UserOutlined />, label: "Profile" },
      { key: "settings", icon: <SettingOutlined />, label: "Settings" },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Sign out", danger: true },
    ],
    onClick: ({ key }) => {
      if (key === "logout") logout();
      if (key === "settings") router.push(`/${section}/settings`);
    },
  };

  const userName = user?.name || "User";
  const userRole = (user?.roles || [user?.role]).filter(Boolean).join(", ");

  return (
    <Layout style={{ minHeight: "100vh" }}>

      {/* ── Sidebar ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={64}
        width={240}
        style={{
          background: "#0f172a",
          boxShadow: "2px 0 12px rgba(0,0,0,.18)",
          overflow: "auto",
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: collapsed ? "0 18px" : "0 20px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, overflow: "hidden",
            flexShrink: 0, background: "#1e293b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Image src="/images/logo.png" alt="logo" width={34} height={34} style={{ objectFit: "cover" }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                Tukaatu Express
              </div>
              <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, whiteSpace: "nowrap" }}>
                Delivery Management
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: 8 }}>
          {loadingMenus ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
              <Spin size="small" />
            </div>
          ) : items.length ? (
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={items}
              onClick={handleMenuClick}
              style={{ background: "transparent", border: "none" }}
            />
          ) : (
            <div style={{ padding: 16 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>No menus</span>}
              />
            </div>
          )}
        </div>

        {/* Sidebar user strip */}
        {!collapsed && (
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <Avatar size={32} style={{ background: avatarColor(userName), flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
              {getInitials(userName)}
            </Avatar>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userName}
              </div>
              <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "capitalize" }}>
                {userRole}
              </div>
            </div>
          </div>
        )}
      </Sider>

      <Layout style={{ background: "#f8fafc" }}>

        {/* ── Header ── */}
        <Header style={{
          background: "#fff",
          padding: "0 20px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          gap: 12,
        }}>

          {/* Left: collapse toggle + breadcrumb */}
          <Space size={12} style={{ minWidth: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "#64748b", fontSize: 16, width: 36, height: 36, padding: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <Typography.Text style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                {userName}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 12, color: "#94a3b8", textTransform: "capitalize" }}>
                {userRole}
              </Typography.Text>
            </div>
          </Space>

          {/* Right: actions */}
          <Space size={4}>
            <Tooltip title="Public Tracker">
              <Button
                type="text"
                icon={<GlobalOutlined />}
                onClick={() => router.push("/track")}
                style={{ color: "#64748b", width: 36, height: 36, padding: 0 }}
              />
            </Tooltip>

            <Tooltip title="Notifications">
              <Badge count={0} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  style={{ color: "#64748b", width: 36, height: 36, padding: 0 }}
                />
              </Badge>
            </Tooltip>

            <div style={{ width: 1, height: 24, background: "#e2e8f0", margin: "0 4px" }} />

            <Dropdown menu={userDropdownItems} placement="bottomRight" trigger={["click"]}>
              <Space style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 8, transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Avatar size={32} style={{ background: avatarColor(userName), fontSize: 12, fontWeight: 700 }}>
                  {getInitials(userName)}
                </Avatar>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    {userName}
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>
                    {userRole}
                  </Typography.Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 20 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
