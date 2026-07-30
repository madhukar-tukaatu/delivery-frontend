"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Menu, Package, PackagePlus, Truck, Store,
  RefreshCcw, ClipboardCheck, MapPinned, Banknote, Settings, Route, Building2, Circle,
} from "lucide-react";
import { getMyMenus } from "@/services/menuService";

const iconMap = {
  dashboard: LayoutDashboard, users: Users, shield: Shield, menu: Menu,
  package: Package, "package-plus": PackagePlus, truck: Truck, store: Store,
  refresh: RefreshCcw, checklist: ClipboardCheck, pickup: MapPinned,
  money: Banknote, settings: Settings, route: Route, branch: Building2, settlement: Banknote,
};

<<<<<<< HEAD
export default function DynamicSidebar({ section = "admin", title = "Courier DMS" }) {
=======
export default function DynamicSidebar({
  section = "admin",
  title = "TUKAATU EXPRESS",
}) {
>>>>>>> 4497cca (updated logo , ui and filtered the branch assignment)
  const pathname = usePathname();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadMenus() {
      try {
        const data = await getMyMenus(section);
        if (active) setMenus(data);
      } catch {
        if (active) setMenus([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadMenus();
    return () => { active = false; };
  }, [section]);

  return (
    <aside style={{
      width: 248, minHeight: "100vh", background: "#071722",
      borderRight: "1px solid rgba(255,255,255,0.06)", padding: "0 0 24px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <div style={{
        padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #027196 0%, #0B8CB7 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: 18, flexShrink: 0,
        }}>T</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "0.04em", lineHeight: 1 }}>
            {title}
          </div>
          <div style={{ color: "#027196", fontWeight: 700, fontSize: 10, letterSpacing: "0.18em", marginTop: 2 }}>
            EXPRESS
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.45)", padding: "16px 20px", fontSize: 13 }}>
          Loading menu...
        </div>
      ) : menus.length === 0 ? (
        <div style={{
          margin: "12px 12px", border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: 10, padding: 12, color: "rgba(255,255,255,0.4)", fontSize: 13,
        }}>
          No menu available for this role.
        </div>
      ) : (
        <nav style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {menus.map((menu) => (
            <MenuLink key={menu.id || menu.path} menu={menu} pathname={pathname} />
          ))}
        </nav>
      )}
    </aside>
  );
}

function MenuLink({ menu, pathname }) {
  const Icon = iconMap[menu.icon] || Circle;
  const active = pathname === menu.path || pathname.startsWith(`${menu.path}/`);

  return (
    <div>
      <Link
        href={menu.path || "#"}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600,
          textDecoration: "none", transition: "all 0.18s ease",
          background: active ? "#027196" : "transparent",
          color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
          boxShadow: active ? "0 4px 14px rgba(2,113,150,0.35)" : "none",
        }}
      >
        <Icon size={16} />
        <span>{menu.label}</span>
      </Link>

      {menu.children?.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {menu.children.map((child) => (
            <MenuLink key={child.id || child.path} menu={child} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}
