"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Typography, Button, Space, Spin, Empty, Avatar, Dropdown, Badge } from "antd";
import {
  AppstoreOutlined, ShopOutlined, NodeIndexOutlined, InboxOutlined, CarOutlined,
  DollarOutlined, SettingOutlined, LogoutOutlined, ApiOutlined, FileTextOutlined,
  UserOutlined, SafetyCertificateOutlined, MenuOutlined, TeamOutlined, BarChartOutlined,
  BellOutlined, CustomerServiceOutlined, ReloadOutlined, CheckSquareOutlined,
  EnvironmentOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";
import { getMyMenus } from "@/services/menuService";

const { Sider, Content } = Layout;

const iconMap = {
  dashboard: <AppstoreOutlined />, branches: <NodeIndexOutlined />, branch: <NodeIndexOutlined />,
  users: <UserOutlined />, roles: <SafetyCertificateOutlined />, shield: <SafetyCertificateOutlined />,
  menus: <MenuOutlined />, menu: <MenuOutlined />, merchants: <ShopOutlined />, merchant: <ShopOutlined />,
  store: <ShopOutlined />, customers: <TeamOutlined />, rates: <DollarOutlined />,
  shipments: <InboxOutlined />, package: <InboxOutlined />, pickups: <CarOutlined />,
  pickup: <CarOutlined />, dispatches: <CarOutlined />, dispatch: <CarOutlined />,
  deliveries: <CarOutlined />, delivery: <CarOutlined />, truck: <CarOutlined />,
  cod: <DollarOutlined />, money: <DollarOutlined />, settlements: <DollarOutlined />,
  invoices: <FileTextOutlined />, webhooks: <ApiOutlined />, api: <ApiOutlined />,
  reports: <BarChartOutlined />, support: <CustomerServiceOutlined />,
  notifications: <BellOutlined />, settings: <SettingOutlined />, refresh: <ReloadOutlined />,
  checklist: <CheckSquareOutlined />, location: <EnvironmentOutlined />,
};

function getIcon(icon) {
  return iconMap[icon] || <AppstoreOutlined />;
}

function buildMenuItems(menus = []) {
  return menus
    .filter((item) => item?.path && item?.label)
    .map((item) => ({
      key: item.path,
      icon: getIcon(item.icon),
      label: item.label,
      children: item.children?.length ? buildMenuItems(item.children) : undefined,
    }));
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

  const userMenuItems = [
    { key: "track", label: "Public Tracker", icon: <EnvironmentOutlined />, onClick: () => router.push("/track") },
    { type: "divider" },
    { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true, onClick: logout },
  ];

  const userInitial = (user?.name || "U")[0].toUpperCase();
  const roleLabel = (user?.roles || [user?.role]).filter(Boolean).join(", ");

  return (
    <Layout style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        width={248}
        trigger={null}
        style={{
          background: "#071722",
          boxShadow: "2px 0 16px rgba(0,0,0,0.18)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "auto",
        }}
      >
        {/* Brand */}
        <div style={{
          padding: collapsed ? "20px 0" : "20px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 8,
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #027196 0%, #0B8CB7 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 18, flexShrink: 0,
          }}>T</div>
          {!collapsed && (
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "0.04em", lineHeight: 1 }}>TUKAATU</div>
              <div style={{ color: "#027196", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", marginTop: 2 }}>EXPRESS</div>
            </div>
          )}
        </div>

        {loadingMenus ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Spin style={{ color: "#027196" }} />
          </div>
        ) : items.length ? (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items}
            onClick={({ key }) => key && key !== pathname && router.push(key)}
            style={{ background: "transparent", border: "none", padding: "0 8px" }}
          />
        ) : (
          <div style={{ padding: 16 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>No menus available</span>}
            />
          </div>
        )}
      </Sider>

      <Layout style={{ background: "#F8FAFC" }}>
        {/* Top Header */}
        <div style={{
          background: "#fff",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: "#64748B", fontSize: 16 }}
            />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", lineHeight: 1.2 }}>
                {user?.name || "User"}
              </div>
              {roleLabel && (
                <div style={{ fontSize: 12, color: "#027196", fontWeight: 600, textTransform: "capitalize" }}>
                  {roleLabel}
                </div>
              )}
            </div>
          </div>

          <Space size={12}>
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                style={{ color: "#64748B" }}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <Avatar
                style={{
                  background: "linear-gradient(135deg, #027196 0%, #0B8CB7 100%)",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 15,
                }}
                size={38}
              >
                {userInitial}
              </Avatar>
            </Dropdown>
          </Space>
        </div>

        <Content style={{ margin: 24, minHeight: "calc(100vh - 112px)" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
