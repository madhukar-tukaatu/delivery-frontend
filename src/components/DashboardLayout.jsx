"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layout, Menu, Typography, Button, Space, Spin, Empty,
  Avatar, Dropdown, Badge, Tooltip, Drawer, Grid,
} from "antd";
import {
  AppstoreOutlined, ShopOutlined, NodeIndexOutlined, InboxOutlined,
  CarOutlined, DollarOutlined, SettingOutlined, LogoutOutlined,
  ApiOutlined, FileTextOutlined, UserOutlined, SafetyCertificateOutlined,
  MenuOutlined, TeamOutlined, BarChartOutlined, BellOutlined,
  CustomerServiceOutlined, ReloadOutlined, CheckSquareOutlined,
  EnvironmentOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  GlobalOutlined, SearchOutlined, LockOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import "./workspace.css";
import { clearAuth, getUser } from "@/lib/auth";
import { getMyMenus } from "@/services/menuService";

const { Header, Sider, Content } = Layout;

const COLORS = {
  darkNavy: "#0F172A",
  primary: "#2563EB",
  primaryText: "#0F172A",
  border: "#E2E8F0",
  pageBackground: "#F8FAFC",
};

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
    .filter((item) => {
      if (!item?.label) return false;
      if (item?.path) return true;
      // Pathless parents are kept when they have children
      return Array.isArray(item.children) && item.children.length > 0;
    })
    .map((item) => {
      const children = item.children?.length
        ? buildMenuItems(item.children)
        : undefined;
      const hasChildren = !!(children && children.length);
      const key = item.path
        ? item.path
        : `group-${item.id ?? item.key ?? item.label}`;
      return {
        key,
        icon: getIcon(item.icon),
        label: item.label,
        children: hasChildren ? children : undefined,
      };
    })
    // Drop pathless parents whose children were all filtered out
    .filter((item) => item.children?.length || !String(item.key).startsWith("group-"));
}


function collectOpenKeys(items = []) {
  const keys = [];
  function walk(list = []) {
    list.forEach((item) => {
      if (item?.children?.length) {
        keys.push(item.key);
        walk(item.children);
      }
    });
  }
  walk(items);
  return keys;
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

export default function DashboardLayout({ section: propsSection = "admin", children }) {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.lg;
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  // Determine section based on user role (overrides prop if needed)
  const section = useMemo(() => {
    const roles = user?.roles || [user?.role];
    const role = roles.filter(Boolean)[0] || '';
    
    // Determine section based on role
    if (role === 'merchant') return 'merchant';
    if (['rider', 'pickup_staff', 'delivery_staff', 'dispatch_staff', 'warehouse_staff'].includes(role)) return 'staff';
    return propsSection; // Default to prop or "admin"
  }, [user, propsSection]);

  const [menus, setMenus] = useState([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState([]);

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

  useEffect(() => {
    setOpenKeys(collectOpenKeys(items));
  }, [items]);
  const selectedKey = useMemo(() => findSelectedKey(pathname, menus), [pathname, menus]);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  function handleMenuClick({ key }) {
    setMobileOpen(false);
    // Pathless parent groups use keys like group-123 — only navigate real paths
    if (key && key.startsWith("/") && key !== pathname) {
      router.push(key);
    }
  }

  const userDropdownItems = {
    items: [
      ...(section !== "merchant" ? [{ key: "profile", icon: <UserOutlined />, label: "Profile" }] : []),
      ...(section === "admin" ? [{ key: "settings", icon: <SettingOutlined />, label: "Settings" }] : []),
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Sign out", danger: true },
    ],
    onClick: ({ key }) => {
      if (key === "logout") logout();
      if (key === "settings") router.push(`/${section}/settings`);
      if (key === "profile") router.push(`/${section}/profile`);
    },
  };

  const userName = user?.name || "User";
  const userRole = (user?.roles || [user?.role]).filter(Boolean).join(", ");


  const workspaceName = { admin: "Operations", merchant: "Merchant", staff: "Team" }[section] || "Operations";
  const navigation = (
    <div className="workspace-sidebar-inner">
      <Link href="/" className="workspace-brand" aria-label="Tukaatu Express home">
        <Image src={collapsed && !mobile ? "/logo-icon.png" : "/images/logo.png"} alt="Tukaatu Express" width={collapsed && !mobile ? 32 : 146} height={44} style={{objectFit:"contain",width:"auto",maxWidth:"100%"}} priority />
      </Link>
      {(!collapsed || mobile) && <p className="workspace-eyebrow">{workspaceName} workspace</p>}
      <nav id="workspace-navigation" aria-label={`${workspaceName} navigation`} className="workspace-navigation">
        {loadingMenus ? <div className="workspace-loading"><Spin size="small" /><span>Loading your workspace</span></div> : items.length ?
          <Menu theme="light" mode="inline" selectedKeys={[selectedKey]} items={items} onClick={handleMenuClick} /> :
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Your menu is unavailable. Please reload or contact support." />}
      </nav>
      {(!collapsed || mobile) && <div className="workspace-sidebar-note"><SafetyCertificateOutlined /><div><strong>Connected delivery.</strong><span>Made for Nepal.</span></div></div>}
    </div>
  );

  return (
    <Layout className="workspace">
      <a href="#workspace-content" className="workspace-skip">Skip to workspace</a>
      {!mobile && <Sider className="workspace-sidebar" width={248} collapsedWidth={80} collapsed={collapsed} trigger={null} collapsible>{navigation}</Sider>}
      <Drawer title="Your workspace" placement="left" width={Math.min(320, typeof window !== "undefined" ? window.innerWidth - 24 : 320)} open={mobile && mobileOpen} onClose={() => setMobileOpen(false)} className="workspace-drawer" styles={{body:{padding:0}}}>{mobile && navigation}</Drawer>
      <Layout className="workspace-main">
        <Header className="workspace-header">
          <div className="workspace-header-left">
            <Button type="text" aria-label={mobile ? "Open workspace navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-controls="workspace-navigation" aria-expanded={mobile ? mobileOpen : !collapsed} icon={mobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => mobile ? setMobileOpen(true) : setCollapsed(!collapsed)} />
            <div><span className="workspace-overline">TUKAATU EXPRESS</span><strong>{workspaceName} workspace</strong></div>
          </div>
          <div className="workspace-header-actions">
            <Link href="/track" className="workspace-track" aria-label="Track parcel"><GlobalOutlined /><span>Track parcel</span></Link>
            {section === "admin" && <Tooltip title="Notifications"><Button type="text" aria-label="Notifications" icon={<BellOutlined />} onClick={() => router.push("/admin/notifications")} /></Tooltip>}
            <Dropdown menu={userDropdownItems} placement="bottomRight" trigger={["click"]}>
              <button className="workspace-account" aria-label={`Account menu for ${userName}`}>
                <Avatar size={36} style={{background:"#e7f2f9",color:"#125f93",fontWeight:700}}>{getInitials(userName)}</Avatar>
                <span><strong>{userName}</strong><small>{userRole || workspaceName}</small></span>
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content className="workspace-content"><main id="workspace-content" tabIndex={-1}>{children}</main><footer className="workspace-footer">Tukaatu Express <span>Built for the people moving Nepal.</span></footer></Content>
      </Layout>
    </Layout>
  );
}
