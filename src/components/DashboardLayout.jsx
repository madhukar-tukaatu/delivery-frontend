"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Typography, Button, Space, Spin, Empty } from "antd";
import {
  AppstoreOutlined,
  ShopOutlined,
  NodeIndexOutlined,
  InboxOutlined,
  CarOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  ApiOutlined,
  FileTextOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  TeamOutlined,
  BarChartOutlined,
  BellOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
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
  cod: <DollarOutlined />,
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

      return {
        key: item.path,
        icon: getIcon(item.icon),
        label: item.label,
        children,
      };
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

export default function DashboardLayout({ section = "admin", children }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMenus() {
      try {
        setLoadingMenus(true);

        const data = await getMyMenus(section);

        if (active) {
          setMenus(data);
        }
      } catch (error) {
        console.error("Failed to load menus:", error);

        if (active) {
          setMenus([]);
        }
      } finally {
        if (active) {
          setLoadingMenus(false);
        }
      }
    }

    loadMenus();

    return () => {
      active = false;
    };
  }, [section]);

  const items = useMemo(() => buildMenuItems(menus), [menus]);

  const selectedKey = useMemo(
    () => findSelectedKey(pathname, menus),
    [pathname, menus]
  );

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  function handleMenuClick({ key }) {
    if (key && key !== pathname) {
      router.push(key);
    }
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0" width={245}>
        <div
          style={{
            color: "white",
            padding: 18,
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          Courier Gateway
        </div>

        {loadingMenus ? (
          <div
            style={{
              color: "white",
              padding: 18,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Spin />
          </div>
        ) : items.length ? (
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={items}
            onClick={handleMenuClick}
          />
        ) : (
          <div style={{ padding: 16 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: "rgba(255,255,255,0.65)" }}>
                  No menus available
                </span>
              }
            />
          </div>
        )}
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography.Text strong>
            {user?.name || "User"}{" "}
            <Typography.Text type="secondary">
              ({(user?.roles || [user?.role]).filter(Boolean).join(", ")})
            </Typography.Text>
          </Typography.Text>

          <Space>
            <Button onClick={() => router.push("/track")}>Public Track</Button>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              Logout
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 20 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}